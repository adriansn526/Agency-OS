/** Keeps the CRM lead of a partner prospect (entityType "service_partners") in step with the partner's registry status. */
import { db } from '@repo/db'

export const PARTNER_ENTITY_TYPE = 'service_partners'

/** Pipeline keys of the "Service partener" CRM type (see scripts/commerce/add-partner-entity-type.ts). */
export const PARTNER_PIPELINE = [
  { key: 'prospect', color: 'info', label: 'Prospect' },
  { key: 'contactat', color: 'warning', label: 'Contactat' },
  { key: 'negociere', color: 'warning', label: 'În discuții' },
  { key: 'acceptat', color: 'success', label: 'Acceptat' },
  { key: 'refuzat', color: 'orange', label: 'Refuzat' },
] as const

const LEAD_STATUS: Record<string, string | undefined> = {
  prospect: 'prospect', contacted: 'contactat', negotiating: 'negociere', active: 'acceptat', declined: 'refuzat',
  // inactive: a paused partner keeps its last lead status
}

export function leadStatusForPartner(status: string): string | null {
  return LEAD_STATUS[status] ?? null
}

export async function syncLeadStatus(partnerId: string, partnerStatus: string): Promise<void> {
  const s = leadStatusForPartner(partnerStatus)
  if (!s) return
  await db.$executeRaw`
    UPDATE "Lead" SET status = ${s}, "updatedAt" = now()
    WHERE "entityType" = ${PARTNER_ENTITY_TYPE} AND "customFields"->>'partnerId' = ${partnerId} AND status <> ${s}`
}
