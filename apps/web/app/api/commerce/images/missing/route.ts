import { db } from '@repo/db'
import { requireCommerceAdmin } from '@/lib/commerce/admin-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

/** GET → CSV (SKU, denumire, categorie) of active products with no image at all (admin). */
export async function GET() {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const rows = await db.$queryRaw<Array<{ sku: string; name: string | null; category: string | null }>>`
    SELECT p."supplierCode" AS sku, COALESCE(p."nameRo", p."nameEn") AS name, c."nameRo" AS category
    FROM "CommerceProduct" p LEFT JOIN "CommerceCategory" c ON c.id = p."categoryId"
    WHERE p."isActive" AND NOT EXISTS (SELECT 1 FROM "CommerceProductImage" i WHERE i."productId" = p.id)
    ORDER BY p."supplierCode"`
  const csv = '﻿SKU,Denumire,Categorie\n' + rows.map((r) => [r.sku, r.name, r.category].map(cell).join(',')).join('\n') + '\n'
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="produse-fara-poza.csv"', 'Cache-Control': 'no-store' } })
}
