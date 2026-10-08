/**
 * BNR (Banca Națională a României) daily exchange rates.
 * Source: https://www.bnr.ro/nbrfxrates.xml (public, no auth).
 */
import { XMLParser } from 'fast-xml-parser'
import { db } from '@repo/db'

const BNR_URL = 'https://www.bnr.ro/nbrfxrates.xml'

interface BnrRate { '@_currency': string; '@_multiplier'?: string; '#text': string | number }

export async function fetchBnrRates(): Promise<{ date: string; rates: Record<string, number> }> {
  const res = await fetch(BNR_URL, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`BNR HTTP ${res.status}`)
  const xml = await res.text()
  if (xml.length > 200_000) throw new Error('BNR response too large')
  const parser = new XMLParser({
    ignoreAttributes: false,
    processEntities: false, // no entity expansion
    allowBooleanAttributes: false,
  })
  const doc = parser.parse(xml)
  const cube = doc?.DataSet?.Body?.Cube
  if (!cube) throw new Error('Unexpected BNR XML structure')
  const date = String(cube['@_date'])
  const list: BnrRate[] = Array.isArray(cube.Rate) ? cube.Rate : [cube.Rate]
  const rates: Record<string, number> = {}
  for (const r of list) {
    const mult = Number(r['@_multiplier'] || 1)
    const v = Number(r['#text'])
    if (Number.isFinite(v) && v > 0) rates[r['@_currency']] = v / mult
  }
  return { date, rates }
}

/** Store today's EUR (and USD) rate; returns latest known rates map (falls back to DB on network error). */
export async function getFxRates(): Promise<Record<string, number>> {
  try {
    const { date, rates } = await fetchBnrRates()
    for (const cur of ['EUR', 'USD']) {
      const rate = rates[cur]
      if (!rate) continue
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
