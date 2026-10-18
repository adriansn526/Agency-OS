/**
 * The company that runs a business line's website, for the legal documents: taken from Setări → Companie (one source of truth), with the contact email
 * overridable per line (WebsiteChannel.config.legalEmail) because the portal's contact address is not the company's general one.
 */
import { db } from '@repo/db'

export interface LegalCompanyOut { name: string; cui: string; reg: string; address: string; email: string }
export interface CompanySettings { legalName?: string; name?: string; cif?: string; regCom?: string; address?: string; email?: string }

const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '')

/** Pure: settings + the line's override → what the documents print. Missing values stay empty strings (the site marks them "de completat"). */
export function buildLegalCompany(settings: CompanySettings | null | undefined, legalEmail?: unknown): LegalCompanyOut {
  const s = settings ?? {}
  return { name: clean(s.legalName) || clean(s.name), cui: clean(s.cif), reg: clean(s.regCom), address: clean(s.address), email: clean(legalEmail) || clean(s.email) }
}

export async function legalCompanyFor(lineId: string, settings: CompanySettings | null): Promise<LegalCompanyOut> {
  const ch = await db.websiteChannel.findUnique({ where: { businessLineId: lineId }, select: { config: true } })
  return buildLegalCompany(settings, (ch?.config as { legalEmail?: unknown } | null)?.legalEmail)
}
