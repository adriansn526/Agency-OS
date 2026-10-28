import { partnerHandler } from '@/lib/website/partner/http'
import { isMedicalEntry, serializeProfile, updateProfile } from '@/lib/website/partner/profile'
import { sessionEntry } from '@/lib/website/partner/auth'
import { getTaxonomy } from '@/lib/website/glossary/live'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = partnerHandler(async (_req, { entry }) => serializeProfile(entry, await getTaxonomy(entry.businessLineId), await isMedicalEntry(entry)))

/** PATCH a subset of: summary, body, phone, email, websiteUrl, address, city, county, program, servicii, certificari. Live immediately. */
export const PATCH = partnerHandler(async (req, ctx) => {
  const body = await req.json().catch(() => null)
  const r = await updateProfile(ctx.entry, body)
  const fresh = await sessionEntry(ctx.businessLineId, ctx.sessionToken)
  return { changed: r.changed, profile: fresh ? serializeProfile(fresh, await getTaxonomy(fresh.businessLineId), await isMedicalEntry(fresh)) : null }
})
