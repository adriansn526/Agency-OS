import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"
import { db, Prisma } from "@repo/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { imageUrl } from "@/lib/commerce/images/urls"

export const dynamic = 'force-dynamic'
const PAGE = 50
const SORTS: Record<string, { label: string; sql: Prisma.Sql }> = {
  sku: { label: "SKU", sql: Prisma.sql`p."supplierCode" ASC` },
  price_desc: { label: "Preț descrescător", sql: Prisma.sql`l."priceRon" DESC NULLS LAST, p."supplierCode"` },
  price_asc: { label: "Preț crescător", sql: Prisma.sql`l."priceRon" ASC NULLS LAST, p."supplierCode"` },
  cost_desc: { label: "Cost descrescător", sql: Prisma.sql`p."costPrice" DESC, p."supplierCode"` },
  updated: { label: "Preț actualizat recent", sql: Prisma.sql`l."priceUpdatedAt" DESC NULLS LAST, p."supplierCode"` },
  views: { label: "Cele mai văzute (30 zile)", sql: Prisma.sql`views DESC, p."supplierCode"` },
}
const ron = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(n))

export default async function CommerceProducts({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const q = (sp.q ?? "").trim().slice(0, 80)
  const noimg = sp.noimg === "1"
  const inactive = sp.inactive === "1"
  const cat = (sp.cat ?? "").slice(0, 40)
  const stock = ["in", "out", "unknown"].includes(sp.stock ?? "") ? sp.stock! : ""
  const sort = SORTS[sp.sort ?? ""] ? sp.sort! : "sku"
  const page = Math.max(1, Math.min(10000, Number(sp.page) || 1))
  const esc = (s: string) => s.replace(/[%_\\]/g, "\\$&")
  const like = `%${esc(q)}%`, starts = `${esc(q)}%`

  const [fx, cats, rows] = await Promise.all([
    db.commerceExchangeRate.findFirst({ where: { currency: "EUR" }, orderBy: { date: "desc" } }),
    db.commerceCategory.findMany({ select: { id: true, nameRo: true, parent: { select: { nameRo: true } } }, orderBy: { nameRo: "asc" } }),
    db.$queryRaw<Array<{
      id: string; active: boolean; sku: string; name: string | null; key: string | null; n: bigint; cost: string; price: string | null
      category: string | null; brand: string | null; quality: string | null; side: string | null; avail: boolean | null; views: bigint; updated: Date | null
    }>>`
      SELECT p.id, p."isActive" AS active, p."supplierCode" AS sku, COALESCE(p."nameRo", p."nameEn") AS name,
             (SELECT i."objectKey" FROM "CommerceProductImage" i WHERE i."productId" = p.id ORDER BY (i.source = 'manual') DESC, i.position LIMIT 1) AS key,
             (SELECT count(*) FROM "CommerceProductImage" i WHERE i."productId" = p.id) AS n,
             p."costPrice"::text AS cost, l."priceRon"::text AS price, l."priceUpdatedAt" AS updated,
             c."nameRo" AS category, p.brand, p.quality, p.side,
             (SELECT bool_or(s."rawFlag" = 1) FROM "CommerceStock" s WHERE s."productId" = p.id) AS avail,
             COALESCE((SELECT sum(d.views) FROM "CommerceDemandDaily" d WHERE d."productId" = p.id AND d.day >= current_date - 30), 0) AS views
      FROM "CommerceProduct" p
      LEFT JOIN "CommerceListing" l ON l."productId" = p.id AND l."businessLineId" = 'cuid_ecaroseria'
      LEFT JOIN "CommerceCategory" c ON c.id = p."categoryId"
      WHERE (${q} = '' OR p."supplierCode" ILIKE ${starts} OR p."nameRo" ILIKE ${like} OR p."nameEn" ILIKE ${like} OR p."oeMain" ILIKE ${starts})
        AND (${!inactive} OR NOT p."isActive")
        AND (${cat} = '' OR p."categoryId" = ${cat})
        AND (${!noimg} OR NOT EXISTS (SELECT 1 FROM "CommerceProductImage" i WHERE i."productId" = p.id))
        AND (${stock} = '' OR (${stock} = 'in' AND EXISTS (SELECT 1 FROM "CommerceStock" s WHERE s."productId" = p.id AND s."rawFlag" = 1))
             OR (${stock} = 'out' AND EXISTS (SELECT 1 FROM "CommerceStock" s WHERE s."productId" = p.id) AND NOT EXISTS (SELECT 1 FROM "CommerceStock" s WHERE s."productId" = p.id AND s."rawFlag" = 1))
             OR (${stock} = 'unknown' AND NOT EXISTS (SELECT 1 FROM "CommerceStock" s WHERE s."productId" = p.id)))
      ORDER BY ${SORTS[sort]!.sql} LIMIT ${PAGE + 1} OFFSET ${(page - 1) * PAGE}`,
  ])
  const rate = fx ? Number(fx.rate) : null
  const more = rows.length > PAGE
  const list = rows.slice(0, PAGE)
  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(cat ? { cat } : {}), ...(stock ? { stock } : {}), ...(sort !== "sku" ? { sort } : {}), ...(noimg ? { noimg: "1" } : {}), ...(inactive ? { inactive: "1" } : {}), page: String(p) })}`
  const sel = "h-9 rounded-md border border-input bg-background px-2 shadow-sm"

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <Link href="/commerce" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Commerce</Link>
        <h1 className="text-3xl font-bold tracking-tight">Produse</h1>
        <p className="text-muted-foreground">Catalog, costuri, prețuri, stoc la furnizor și poze. Prețurile sunt cele din storefront (RON, TVA inclus).</p>
      </div>
      <form className="flex flex-wrap items-center gap-3 text-sm">
        <input name="q" defaultValue={q} placeholder="SKU, cod OE sau denumire" className="h-9 w-64 rounded-md border border-input bg-background px-3 shadow-sm" />
        <select name="cat" defaultValue={cat} className={sel}><option value="">Toate categoriile</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.nameRo} › ` : ""}{c.nameRo}</option>)}</select>
        <select name="stock" defaultValue={stock} className={sel}><option value="">Orice stoc</option><option value="in">Disponibil la furnizor</option><option value="out">Epuizat la furnizor</option><option value="unknown">Fără date de stoc</option></select>
        <select name="sort" defaultValue={sort} className={sel}>{Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <label className="flex items-center gap-2"><input type="checkbox" name="noimg" value="1" defaultChecked={noimg} /> Doar fără poză</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="inactive" value="1" defaultChecked={inactive} /> Doar inactive</label>
        <button className="h-9 rounded-md bg-primary px-4 text-primary-foreground">Caută</button>
        <a href="/api/commerce/images/missing" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"><Download className="h-4 w-4" /> Export CSV produse fără poză</a>
      </form>
      <Card><CardContent className="p-0"><div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-muted-foreground">
            <th className="p-3 w-16">Poză</th><th className="p-3">SKU</th><th className="p-3">Denumire</th><th className="p-3">Categorie</th><th className="p-3">Brand / calitate</th>
            <th className="p-3 text-right">Cost €</th><th className="p-3 text-right">Preț</th><th className="p-3 text-right">Adaos</th><th className="p-3">Stoc furnizor</th><th className="p-3 text-right">Vizualiz. 30z</th><th className="p-3">Poze</th>
          </tr></thead>
          <tbody>
            {list.map((r) => {
              const u = r.key ? imageUrl(r.key) : null
              const cost = Number(r.cost), price = r.price != null ? Number(r.price) : null
              const markup = price != null && rate && cost > 0 ? (price / 1.21 / (cost * rate) - 1) * 100 : null
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40 align-middle">
                  <td className="p-3">{u ? <img src={u} alt="" loading="lazy" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded border border-dashed" />}</td>
                  <td className="p-3 font-mono"><Link className="text-primary hover:underline" href={`/commerce/products/${r.id}`}>{r.sku}</Link></td>
                  <td className="p-3 max-w-xs">{r.name ?? "—"}{!r.active && <Badge variant="destructive" className="ml-2">inactiv</Badge>}</td>
                  <td className="p-3 text-muted-foreground">{r.category ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{[r.brand, r.quality, r.side].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="p-3 text-right">{cost.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}</td>
                  <td className="p-3 text-right font-medium">{ron(price)}</td>
                  <td className="p-3 text-right text-muted-foreground">{markup == null ? "—" : `${markup.toFixed(0)}%`}</td>
                  <td className="p-3">{r.avail == null ? <span className="text-muted-foreground">—</span> : r.avail ? <Badge variant="secondary">disponibil</Badge> : <Badge variant="destructive">epuizat</Badge>}</td>
                  <td className="p-3 text-right">{Number(r.views) || "—"}</td>
                  <td className="p-3">{Number(r.n) > 0 ? <Badge variant="secondary">{String(r.n)}</Badge> : <Badge variant="destructive">fără</Badge>}</td>
                </tr>
              )
            })}
            {list.length === 0 && <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">Niciun produs.</td></tr>}
          </tbody>
        </table>
      </div></CardContent></Card>
      <div className="flex gap-3 text-sm">
        {page > 1 && <Link className="text-primary hover:underline" href={qs(page - 1)}>← Înapoi</Link>}
        <span className="text-muted-foreground">Pagina {page}{rate ? ` · curs BNR ${rate}` : ""}</span>
        {more && <Link className="text-primary hover:underline" href={qs(page + 1)}>Înainte →</Link>}
      </div>
    </div>
  )
}
