/**
 * Partner garage ⇄ accounting supplier.
 *
 * A prospect is a CRM lead; an accepted partner is a row in the partner registry (rates, jobs, settlement); the garage becomes a
 * Supplier (modul Furnizori: CUI, IBAN, invoices, payments) when it starts invoicing us. The link is explicit and optional:
 * a supplier created here is scoped to the eCaroseria business line only (it does not appear on the other lines).
 */
import { db } from '@repo/db'
import { z } from 'zod'
import { ScopeError, visibleOnLine } from '../../suppliers/scope'
import { PartnerError, partnerBusinessLineId } from './service'

const cleanCui = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')
const cleanIban = (v: string) => v.toUpperCase().replace(/\s+/g, '')

const CreateBody = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  // Same format the e-Factura parser stores (letters/digits, "RO" prefix when VAT-registered): matching invoices is by exact CUI.
  cui: z.string().trim().transform(cleanCui).refine((v) => v === '' || /^(RO)?\d{2,10}$/.test(v), 'CUI invalid (ex.: 12345678 sau RO12345678)').optional(),
  iban: z.string().trim().transform(cleanIban).refine((v) => v === '' || /^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/.test(v), 'IBAN invalid (RO + 22 caractere)').optional(),
  vatRegime: z.enum(['domestic', 'intracommunity', 'extracommunity']).default('domestic'),
})
const LinkBody = z.union([z.object({ supplierId: z.string().min(8).max(40) }), z.object({ create: CreateBody })])

async function tenantId(): Promise<string> {
  const t = await db.tenantInstance.findFirst({ select: { id: true } })
  if (!t) throw new PartnerError('Tenant negăsit', 500)
  return t.id
}

export async function linkPartnerSupplier(partnerId: string, input: unknown) {
  const body = LinkBody.parse(input)
  const businessLineId = await partnerBusinessLineId()
  const partner = await db.commerceServicePartner.findFirst({ where: { id: partnerId, businessLineId } })
  if (!partner) throw new PartnerError('Not found', 404)
  if (partner.supplierId) throw new PartnerError('Partenerul are deja un furnizor asociat', 409)
  const tid = await tenantId()

  let supplierId: string
  if ('supplierId' in body) {
    // Only suppliers visible on this line (shared or scoped to it) can be linked
    const s = await db.supplier.findFirst({ where: { id: body.supplierId, tenantId: tid, ...(visibleOnLine(businessLineId) ?? {}) }, select: { id: true } })
    if (!s) throw new PartnerError('Furnizorul nu există sau nu este disponibil pe această linie de business', 404)
    const taken = await db.commerceServicePartner.findFirst({ where: { supplierId: s.id }, select: { name: true } })
    if (taken) throw new PartnerError(`Furnizorul este deja asociat partenerului „${taken.name}”`, 409)
    supplierId = s.id
  } else {
    const c = body.create
    const cui = c.cui || null
    if (cui) {
      const dup = await db.supplier.findFirst({ where: { tenantId: tid, cui }, select: { id: true, name: true } })
      // A second supplier with the same CUI would split the invoices (e-Factura matches by CUI): link the existing one instead.
      if (dup) throw new PartnerError(`Există deja un furnizor cu acest CUI: „${dup.name}”. Asociază-l pe acela.`, 409)
    }
    const created = await db.supplier.create({
      data: {
        tenantId: tid, name: c.name ?? partner.name, cui, iban: c.iban || null, vatRegime: c.vatRegime,
        invoiceFetchMethod: cui ? 'efactura' : 'manual', businessLineIds: [businessLineId], category: null,
      },
      select: { id: true },
    })
    supplierId = created.id
  }
  await db.commerceServicePartner.update({ where: { id: partnerId }, data: { supplierId } })
  return getPartnerSupplier(supplierId)
}

export async function unlinkPartnerSupplier(partnerId: string) {
  const businessLineId = await partnerBusinessLineId()
  const r = await db.commerceServicePartner.updateMany({ where: { id: partnerId, businessLineId }, data: { supplierId: null } })
  if (r.count === 0) throw new PartnerError('Not found', 404)
}

export async function getPartnerSupplier(supplierId: string) {
  return db.supplier.findUnique({ where: { id: supplierId }, select: { id: true, name: true, cui: true, iban: true, status: true, businessLineIds: true } })
}

export { ScopeError }

/** Suppliers a partner can be linked to: visible on the eCaroseria line and not already linked to another partner. */
export async function searchLinkableSuppliers(q: string) {
  const businessLineId = await partnerBusinessLineId()
  const tid = await tenantId()
  const term = q.trim().slice(0, 80)
  const rows = await db.supplier.findMany({
    where: {
      tenantId: tid, status: 'active', ...(visibleOnLine(businessLineId) ?? {}),
      ...(term ? { AND: [{ OR: [{ name: { contains: term, mode: 'insensitive' } }, { cui: { contains: term, mode: 'insensitive' } }] }] } : {}),
    },
    select: { id: true, name: true, cui: true }, orderBy: { name: 'asc' }, take: 20,
  })
  const taken = await db.commerceServicePartner.findMany({ where: { supplierId: { in: rows.map((r) => r.id) } }, select: { supplierId: true } })
  const takenIds = new Set(taken.map((t) => t.supplierId))
  return { suppliers: rows.filter((r) => !takenIds.has(r.id)).slice(0, 8) }
}
