/**
 * Readers/parsers for the two supplier files used by the price & stock sync.
 *
 *   PRICELIST_<id>.txt   ISO-8859-7, ';', 11 columns, decimal comma, no header, CRLF
 *   OUTOFSTOCK_ALL.txt   ASCII, ';', 3 columns (warehouse;code;flag) — the guide mentions a 4th (barcode) which the real file lacks
 *
 * Zip entries are read into memory only (never extracted to disk → no path traversal), CRC-checked and size-capped,
 * and decoded in slices so the whole text is never held as one giant string.
 */
import AdmZip from 'adm-zip'
import { crc32 } from 'node:zlib'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const MAX_ENTRY_BYTES = 200 * 1024 * 1024
const MAX_RATIO = 60 // uncompressed/compressed — a plain text feed is ~10×; far above that is suspicious
const SLICE = 1 << 20
const MAX_ERROR_SAMPLES = 25

export class FeedFormatError extends Error {}

/** Reads the single .txt entry of a feed zip (or a plain .txt) into a Buffer, verifying integrity. */
export function readFeedFile(file: string): { buf: Buffer; entry: string; zipped: boolean } {
  if (!/\.zip$/i.test(file)) return { buf: readFileSync(file), entry: path.basename(file), zipped: false }
  const raw = readFileSync(file)
  let zip: AdmZip
  try {
    zip = new AdmZip(raw)
  } catch (e) {
    throw new FeedFormatError(`${path.basename(file)}: not a readable zip (${e instanceof Error ? e.message : e})`)
  }
  const entries = zip.getEntries().filter((e) => !e.isDirectory)
  if (entries.length !== 1 || !/\.txt$/i.test(entries[0]!.entryName)) {
    throw new FeedFormatError(`${path.basename(file)}: expected exactly one .txt entry, found ${entries.map((e) => e.entryName).join(', ') || 'none'}`)
  }
  const e = entries[0]!
  if (e.header.size > MAX_ENTRY_BYTES) throw new FeedFormatError(`${e.entryName}: too large (${e.header.size} bytes)`)
  if (e.header.compressedSize > 0 && e.header.size / e.header.compressedSize > MAX_RATIO) {
    throw new FeedFormatError(`${e.entryName}: suspicious compression ratio`)
  }
  const buf = e.getData()
  if (buf.length !== e.header.size) throw new FeedFormatError(`${e.entryName}: size mismatch (${buf.length} vs ${e.header.size})`)
  if (crc32(buf) >>> 0 !== e.header.crc) throw new FeedFormatError(`${e.entryName}: CRC mismatch — file is corrupt or truncated`)
  return { buf, entry: path.basename(e.entryName), zipped: true }
}

/** Yields lines (without CR/LF); empty lines skipped. Decodes in slices with a streaming decoder. */
export function* iterLines(buf: Buffer, encoding: string): Generator<string> {
  const dec = new TextDecoder(encoding)
  let carry = ''
  for (let off = 0; off < buf.length; off += SLICE) {
    const text = carry + dec.decode(buf.subarray(off, Math.min(buf.length, off + SLICE)), { stream: true })
    const parts = text.split('\n')
    carry = parts.pop() ?? ''
    for (const p of parts) {
      const line = p.endsWith('\r') ? p.slice(0, -1) : p
      if (line.length) yield line
    }
  }
  carry += dec.decode()
  if (carry.endsWith('\r')) carry = carry.slice(0, -1)
  if (carry.length) yield carry
}

// ─── PRICELIST ───

export interface BaseItem {
  code: string
  oeMain: string
  nameEl: string
  nameEn: string
  side: string
  modelCode: string
  make: string
  modelName: string
  price: number
  group: string
}

export interface PricelistResult {
  totalRows: number
  base: Map<string, BaseItem>
  /** every item code in the file (base and "similar"), to tell stock rows of unknown articles apart */
  allCodes: Set<string>
  baseRows: number
  duplicateBaseCodes: number
  parseErrors: number
  errorSamples: string[]
}

const CODE_RE = /^\d{6,12}$/
const PRICE_RE = /^\d{1,7}(,\d{1,4})?$/

export function parsePricelist(buf: Buffer): PricelistResult {
  const out: PricelistResult = { totalRows: 0, base: new Map(), allCodes: new Set(), baseRows: 0, duplicateBaseCodes: 0, parseErrors: 0, errorSamples: [] }
  const err = (n: number, why: string) => {
    out.parseErrors++
    if (out.errorSamples.length < MAX_ERROR_SAMPLES) out.errorSamples.push(`line ${n}: ${why}`)
  }
  let n = 0
  for (const line of iterLines(buf, 'iso-8859-7')) {
    n++
    out.totalRows++
    const c = line.split(';')
    if (c.length !== 11) { err(n, `${c.length} columns`); continue }
    const code = c[0]!.trim()
    const barcode = c[10]!.trim()
    if (!CODE_RE.test(code) || !CODE_RE.test(barcode)) { err(n, 'invalid code/barcode'); continue }
    const priceTxt = c[8]!.trim()
    if (!PRICE_RE.test(priceTxt)) { err(n, `invalid price "${priceTxt.slice(0, 20)}"`); continue }
    out.allCodes.add(code)
    if (code !== barcode) continue // "similar" code: not a base article, never sold on its own
    const price = Number(priceTxt.replace(',', '.'))
    if (!(price > 0)) { err(n, 'non-positive price'); continue }
    out.baseRows++
    if (out.base.has(code)) { out.duplicateBaseCodes++; continue }
    out.base.set(code, {
      code,
      oeMain: c[1]!.trim(),
      nameEl: c[2]!.trim(),
      nameEn: c[3]!.trim().replace(/\s+/g, ' '),
      side: c[4]!.trim().toUpperCase(),
      modelCode: c[5]!.trim(),
      make: c[6]!.trim(),
      modelName: c[7]!.trim(),
      price,
      group: c[9]!.trim(),
    })
  }
  return out
}

// ─── OUTOFSTOCK ───

export interface StockResult {
  totalRows: number
  /** code → warehouse → flag (1 available, 0 not). Duplicate (warehouse, code) rows merge as "any 1 wins". */
  byCode: Map<string, Map<string, 0 | 1>>
  duplicateRows: number
  conflictingDuplicates: number
  parseErrors: number
  errorSamples: string[]
}

export function parseOutOfStock(buf: Buffer): StockResult {
  const out: StockResult = { totalRows: 0, byCode: new Map(), duplicateRows: 0, conflictingDuplicates: 0, parseErrors: 0, errorSamples: [] }
  const err = (n: number, why: string) => {
    out.parseErrors++
    if (out.errorSamples.length < MAX_ERROR_SAMPLES) out.errorSamples.push(`line ${n}: ${why}`)
  }
  let n = 0
  for (const line of iterLines(buf, 'utf-8')) {
    n++
    out.totalRows++
    const c = line.split(';')
    if (c.length < 3 || c.length > 4) { err(n, `${c.length} columns`); continue }
    const wh = c[0]!.trim().toLowerCase()
    // With the optional 4th column (barcode) the barcode is the base article; otherwise the item code is.
    const code = (c.length === 4 ? c[3]! : c[1]!).trim()
    const flag = c[2]!.trim()
    if (!/^[a-z]{2,8}$/.test(wh) || !CODE_RE.test(code) || (flag !== '0' && flag !== '1')) { err(n, 'invalid warehouse/code/flag'); continue }
    let m = out.byCode.get(code)
    if (!m) out.byCode.set(code, (m = new Map()))
    const prev = m.get(wh)
    const f = Number(flag) as 0 | 1
    if (prev === undefined) m.set(wh, f)
    else {
      out.duplicateRows++
      if (prev !== f) { out.conflictingDuplicates++; m.set(wh, 1) }
    }
  }
  return out
}
