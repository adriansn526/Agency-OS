/**
 * Parser for the Greek supplier flat-file feed ("gr-txt-v1").
 *
 * Files (each inside its own zip):
 *   PRICELIST_<id>.txt  ISO-8859-7, ';' separated, 11 columns
 *   GENUINE.txt         listingCode;oeRaw;oeNormalized
 *   REFAR.txt           listingCode;relatedListingCode
 *   OUTOFSTOCK_ALL.txt  warehouse;listingCode;flag
 *
 * Zip entries are read into memory only (never extracted to disk), so entry names
 * cannot cause path traversal.
 */
import AdmZip from 'adm-zip'
import { readdirSync, statSync } from 'fs'
import path from 'path'
import { parseDecimalComma } from '../text'

export interface PriceRow {
  listingCode: string
  oeMain: string
  nameEl: string
  nameEn: string
  side: string
  modelCode: string
  make: string
  modelName: string
  price: number
  group: string
  baseCode: string
}

export interface FeedData {
  rows: PriceRow[]
  genuine: Array<[listingCode: string, raw: string, normalized: string]>
  refar: Array<[a: string, b: string]>
  stock: Array<[warehouse: string, code: string, flag: number]>
  files: Record<string, { entry: string; bytes: number }>
  errors: string[]
}

const MAX_ENTRY_BYTES = 200 * 1024 * 1024 // 200 MB safety cap per file

function readSingleEntry(zipPath: string, encoding: string): { text: string; entry: string; bytes: number } {
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries().filter((e) => !e.isDirectory && /\.(txt|csv)$/i.test(e.entryName))
  if (entries.length !== 1) throw new Error(`${path.basename(zipPath)}: expected exactly 1 .txt entry, found ${entries.length}`)
  const entry = entries[0]!
  if (entry.header.size > MAX_ENTRY_BYTES) throw new Error(`${entry.entryName}: too large (${entry.header.size} bytes)`)
  const buf = entry.getData()
  const text = new TextDecoder(encoding.toLowerCase()).decode(buf)
  return { text, entry: path.basename(entry.entryName), bytes: buf.length }
}

function lines(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => l.trim().length > 0)
}

/**
 * Resolve feed files inside an allowed directory. `dir` comes from feed config, but must
 * resolve inside COMMERCE_FEED_ROOT to avoid reading arbitrary paths.
 */
export function resolveFeedDir(dir: string): string {
  const root = process.env.COMMERCE_FEED_ROOT
  if (!root) throw new Error('COMMERCE_FEED_ROOT is not configured')
  const rootResolved = path.resolve(root)
  const resolved = path.resolve(rootResolved, dir)
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) {
    throw new Error('Feed directory is outside COMMERCE_FEED_ROOT')
  }
  if (!statSync(resolved).isDirectory()) throw new Error('Feed directory not found')
  return resolved
}

export function parseGrTxtFeed(dir: string, encoding = 'ISO-8859-7'): FeedData {
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.zip'))
  const pick = (re: RegExp) => {
    const f = files.find((x) => re.test(x))
    if (!f) throw new Error(`Missing feed file matching ${re}`)
    return path.join(dir, path.basename(f))
  }

  const data: FeedData = { rows: [], genuine: [], refar: [], stock: [], files: {}, errors: [] }

  // PRICELIST
  const pl = readSingleEntry(pick(/^PRICELIST_.*\.zip$/i), encoding)
  data.files.pricelist = { entry: pl.entry, bytes: pl.bytes }
  for (const [i, line] of lines(pl.text).entries()) {
    const c = line.split(';')
    if (c.length < 11) {
      data.errors.push(`pricelist line ${i + 1}: ${c.length} columns`)
      continue
    }
    const price = parseDecimalComma(c[8]!)
    const listingCode = c[0]!.trim()
    const baseCode = c[10]!.trim()
    if (!/^\d{6,12}$/.test(listingCode) || !/^\d{6,12}$/.test(baseCode) || !Number.isFinite(price)) {
      data.errors.push(`pricelist line ${i + 1}: invalid code/price`)
      continue
    }
    data.rows.push({
      listingCode,
      oeMain: c[1]!.trim(),
      nameEl: c[2]!.trim(),
      nameEn: c[3]!.trim().replace(/\s+/g, ' '),
      side: c[4]!.trim().toUpperCase(),
      modelCode: c[5]!.trim(),
      make: c[6]!.trim(),
      modelName: c[7]!.trim(),
      price,
      group: c[9]!.trim(),
      baseCode,
    })
  }

  // GENUINE (ASCII)
  const ge = readSingleEntry(pick(/^GENUINE.*\.zip$/i), 'utf-8')
  data.files.genuine = { entry: ge.entry, bytes: ge.bytes }
  for (const line of lines(ge.text)) {
    const [code, raw, norm] = line.split(';').map((s) => s.trim())
    if (code && raw) data.genuine.push([code, raw.slice(0, 64), (norm || raw).slice(0, 64)])
  }

  // REFAR
  const rf = readSingleEntry(pick(/^REFAR.*\.zip$/i), 'utf-8')
  data.files.refar = { entry: rf.entry, bytes: rf.bytes }
  for (const line of lines(rf.text)) {
    const [a, b] = line.split(';').map((s) => s.trim())
    if (a && b) data.refar.push([a, b])
  }

  // OUTOFSTOCK
  const st = readSingleEntry(pick(/^OUTOFSTOCK.*\.zip$/i), 'utf-8')
  data.files.stock = { entry: st.entry, bytes: st.bytes }
  for (const line of lines(st.text)) {
    const [wh, code, flag] = line.split(';').map((s) => s.trim())
    if (wh && code && (flag === '0' || flag === '1')) data.stock.push([wh.slice(0, 8), code, Number(flag)])
  }

  return data
}
