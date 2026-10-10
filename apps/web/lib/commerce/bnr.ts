/**
 * BNR (Banca Națională a României) daily exchange rates.
 * Source: https://curs.bnr.ro/nbrfxrates.xml (public, no auth). www.bnr.ro answers bots with HTML, so it is not used.
 * Published on working days (around 13:00 Romanian time); the 10-day file is the fallback and fills weekend gaps.
 */
import { XMLParser } from 'fast-xml-parser'
import { db } from '@repo/db'

const BNR_URLS = ['https://curs.bnr.ro/nbrfxrates.xml', 'https://curs.bnr.ro/nbrfxrates10days.xml']
/** A fresh rate further than this from the last stored one is treated as bad data, not applied. */
const MAX_JUMP = 0.15

interface BnrRate { '@_currency': string; '@_multiplier'?: string; '#text': string | number }
interface BnrCube { '@_date': string; Rate: BnrRate | BnrRate[] }

export function parseBnrXml(xml: string): { date: string; rates: Record<string, number> } {
  if (xml.length > 400_000) throw new Error('BNR response too large')
  const parser = new XMLParser({
    ignoreAttributes: false,
    processEntities: false, // no entity expansion
    allowBooleanAttributes: false,
  })
  const doc = parser.parse(xml)
  const raw = doc?.DataSet?.Body?.Cube as BnrCube | BnrCube[] | undefined
  if (!raw) throw new Error('Unexpected BNR XML structure')
  const cubes = (Array.isArray(raw) ? raw : [raw]).filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(String(c['@_date'])))
  if (!cubes.length) throw new Error('BNR XML has no dated rates')
  // The 10-day file lists several dates: take the most recent one.
  const cube = cubes.reduce((a, b) => (String(b['@_date']) > String(a['@_date']) ? b : a))
  const list: BnrRate[] = Array.isArray(cube.Rate) ? cube.Rate : [cube.Rate]
  const rates: Record<string, number> = {}
  for (const r of list) {
    const mult = Number(r['@_multiplier'] || 1)
    const v = Number(r['#text'])
    if (Number.isFinite(v) && v > 0 && mult > 0) rates[r['@_currency']] = Number((v / mult).toFixed(8))
  }
  return { date: String(cube['@_date']), rates }
}

export async function fetchBnrRates(): Promise<{ date: string; rates: Record<string, number> }> {
  let lastErr: unknown
  for (const url of BNR_URLS) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/xml', 'User-Agent': 'AgencyOS/1.0' } })
      if (!res.ok) throw new Error(`BNR HTTP ${res.status}`)
      return parseBnrXml(await res.text())
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('BNR fetch failed')
}

/** Store the latest EUR (and USD) rate; returns latest known rates map (falls back to DB on network error). */
export async function getFxRates(): Promise<Record<string, number>> {
  try {
    const { date, rates } = await fetchBnrRates()
    for (const cur of ['EUR', 'USD']) {
      const rate = rates[cur]
      if (!rate) continue
      const last = await db.commerceExchangeRate.findFirst({ where: { currency: cur }, orderBy: { date: 'desc' } })
      if (last && Math.abs(rate / Number(last.rate) - 1) > MAX_JUMP) {
        console.warn(`[BNR] ${cur} ${rate} differs more than ${MAX_JUMP * 100}% from stored ${Number(last.rate)} — not stored`)
        continue
      }
      await db.commerceExchangeRate.upsert({
        where: { currency_date: { currency: cur, date: new Date(date) } },
        update: { rate },
        create: { currency: cur, rate, date: new Date(date) },
      })
    }
  } catch (e) {
    console.warn('[BNR] fetch failed, using last stored rate:', e instanceof Error ? e.message : e)
  }
  const out: Record<string, number> = {}
  for (const cur of ['EUR', 'USD']) {
    const last = await db.commerceExchangeRate.findFirst({ where: { currency: cur }, orderBy: { date: 'desc' } })
    if (last) out[cur] = Number(last.rate)
  }
  return out
}

export interface FxQuote { currency: string; rate: number; date: string; fresh: boolean }

/**
 * Rate used for repricing: the latest BNR publication, stored when sane; otherwise the last stored one, flagged `fresh: false`.
 * `dryRun` never writes to the DB.
 */
export async function getFxQuote(currency: string, opts: { dryRun?: boolean } = {}): Promise<FxQuote> {
  if (currency === 'RON') return { currency, rate: 1, date: new Date().toISOString().slice(0, 10), fresh: true }
  const last = await db.commerceExchangeRate.findFirst({ where: { currency }, orderBy: { date: 'desc' } })
  try {
    const { date, rates } = await fetchBnrRates()
    const rate = rates[currency]
    if (!rate) throw new Error(`BNR has no ${currency} rate`)
    if (last && Math.abs(rate / Number(last.rate) - 1) > MAX_JUMP) {
      throw new Error(`BNR ${currency} ${rate} differs more than ${MAX_JUMP * 100}% from stored ${Number(last.rate)}`)
    }
    if (!opts.dryRun) {
      await db.commerceExchangeRate.upsert({
        where: { currency_date: { currency, date: new Date(date) } },
        update: { rate },
        create: { currency, rate, date: new Date(date) },
      })
    }
    return { currency, rate, date, fresh: true }
  } catch (e) {
    console.warn('[BNR] using last stored rate:', e instanceof Error ? e.message : e)
    if (!last) throw new Error(`No ${currency} exchange rate available (BNR unreachable and none stored)`)
    return { currency, rate: Number(last.rate), date: last.date.toISOString().slice(0, 10), fresh: false }
  }
}
