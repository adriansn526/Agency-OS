/**
 * Doctor-to-doctor endorsements: pure rules (no database).
 *
 * Who counts: an endorsement is counted on the endorsee's profile only when (1) the endorser currently has a valid CMR verification,
 * (2) the two doctors do not share a clinic, and (3) the endorsee has not endorsed the endorser back (a mutual pair is shown to neither as a count).
 * Endorsements are never paid for and are independent of any plan or paid position.
 */
import { z } from 'zod'

export const NOTE_MAX = 280
/** New endorsements one doctor can make in a rolling 30 days. */
export const MONTHLY_LIMIT = 10
export const WINDOW_DAYS = 30

export const endorseInput = z.object({
  slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{0,118}$/, 'Profil invalid'),
  note: z.string().trim().max(NOTE_MAX).optional(),
  showName: z.boolean().optional(),
}).strict()

export const visibilityInput = z.object({ showName: z.boolean() }).strict()

export const normClinic = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

/** The clinics a doctor lists on the profile (entry data key `clinici`), normalised for comparison. */
export function clinicsOf(data: unknown): string[] {
  const list = (data as { clinici?: unknown } | null)?.clinici
  return Array.isArray(list) ? list.map((c) => normClinic(String(c))).filter(Boolean) : []
}

export const sharesClinic = (a: unknown, b: unknown) => {
  const mine = new Set(clinicsOf(a))
  return clinicsOf(b).some((c) => mine.has(c))
}

export interface CountableRow { endorserId: string; endorseeId: string; sameClinic: boolean; endorserCmrActive: boolean }

/** `endorsedBack` holds `${endorseeId}>${endorserId}` for every active endorsement, so a row is mutual when its reverse is in the set. */
export const isCounted = (r: CountableRow, endorsedBack: Set<string>) => !r.sameClinic && r.endorserCmrActive && !endorsedBack.has(`${r.endorseeId}>${r.endorserId}`)
