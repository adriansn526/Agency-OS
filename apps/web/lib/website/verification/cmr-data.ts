import { z } from 'zod'

/** Pure part of the CMR verification (format, validation, expiry): no database, so the public serializer can use it. See cmr.ts for the flow. */
export const CMR_KEY = 'verificare_cmr'
export const CMR_REGISTER_URL = 'https://regmed.cmr.ro/registrul-medicilor'

export interface CmrVerification { name: string; county: string; specialities: string[]; practiceUntil: string; parafa: string; verifiedAt: string; verifiedBy: string }

const clean = (v: string, max = 80) => v.replace(/[|;\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(d)), 'Dată invalidă')

/** What the team types after reading the register entry. The profile must show a right to practise and no restrictions. */
export const cmrInput = z.object({
  name: z.string().trim().min(3).max(80),
  county: z.string().trim().max(40).optional().default(''),
  specialities: z.array(z.string().trim().min(2).max(60)).max(10).default([]),
  practiceUntil: isoDate,
  parafa: z.string().trim().regex(/^[A-Za-z0-9]{4,10}$/, 'Codul de parafă are 4–10 litere și cifre').optional().default(''),
  hasPracticeRight: z.literal(true, { message: 'Confirmă că registrul arată drept de practică' }),
  hasRestrictions: z.literal(false, { message: 'Un medic cu restrângeri ale dreptului de practică nu se marchează ca verificat' }),
}).strict()

/** CMR|name|county|spec;spec|practiceUntil|verifiedAt|verifiedBy|parafa */
export const encodeCmr = (v: CmrVerification) => ['CMR', clean(v.name), clean(v.county, 40), v.specialities.map((s) => clean(s, 60)).join(';'), v.practiceUntil, v.verifiedAt.slice(0, 10), clean(v.verifiedBy, 40), clean(v.parafa, 10)].join('|')

export function decodeCmr(list: unknown): CmrVerification[] {
  if (!Array.isArray(list)) return []
  const out: CmrVerification[] = []
  for (const s of list) {
    const p = String(s).split('|')
    if (p.length === 8 && p[0] === 'CMR' && /^\d{4}-\d{2}-\d{2}$/.test(p[4]!) && /^\d{4}-\d{2}-\d{2}$/.test(p[5]!)) {
      out.push({ name: p[1]!, county: p[2]!, specialities: p[3] ? p[3].split(';') : [], practiceUntil: p[4]!, verifiedAt: p[5]!, verifiedBy: p[6]!, parafa: p[7]! })
    }
  }
  return out
}

/** A verification does not outlive the practice right printed in the register (the annual aviz): after that the badge disappears until re-checked. */
export const activeCmr = (list: CmrVerification[], now = new Date()) => list.filter((v) => v.practiceUntil >= now.toISOString().slice(0, 10))

