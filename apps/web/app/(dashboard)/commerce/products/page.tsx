import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"
import { db } from "@repo/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { imageUrl } from "@/lib/commerce/images/urls"

export const dynamic = 'force-dynamic'
const PAGE = 50

export default async function CommerceProducts({ searchParams }: { searchParams: Promise<{ q?: string; noimg?: string; inactive?: string; page?: string }> }) {
  const sp = await searchParams
  const q = (sp.q ?? "").trim().slice(0, 80)
  const noimg = sp.noimg === "1"
  const inactive = sp.inactive === "1"
  const page = Math.max(1, Math.min(10000, Number(sp.page) || 1))
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`
  const starts = `${q.replace(/[%_\\]/g, "\\$&")}%`

  const rows = await db.$queryRaw<Array<{ id: string; sku: string; name: string | null; key: string | null; n: bigint; active: boolean }>>`
    SELECT p.id, p."isActive" AS active, p."supplierCode" AS sku, COALESCE(p."nameRo", p."nameEn") AS name,
           (SELECT i."objectKey" FROM "CommerceProductImage" i WHERE i."productId" = p.id ORDER BY (i.source = 'manual') DESC, i.position LIMIT 1) AS key,
           (SELECT count(*) FROM "CommerceProductImage" i WHERE i."productId" = p.id) AS n
    FROM "CommerceProduct" p
    WHERE (${q} = '' OR p."supplierCode" ILIKE ${starts} OR p."nameRo" ILIKE ${like} OR p."nameEn" ILIKE ${like})
      AND (${!inactive} OR NOT p."isActive")
      AND (${!noimg} OR NOT EXISTS (SELECT 1 FROM "CommerceProductImage" i WHERE i."productId" = p.id))
    ORDER BY p."supplierCode" LIMIT ${PAGE + 1} OFFSET ${(page - 1) * PAGE}`
  const more = rows.length > PAGE
  const list = rows.slice(0, PAGE)
  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), ...(noimg ? { noimg: "1" } : {}), ...(inactive ? { inactive: "1" } : {}), page: String(p) })}`

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <Link href="/commerce" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Commerce</Link>
        <h1 className="text-3xl font-bold tracking-tight">Produse și poze</h1>
        <p className="text-muted-foreground">Pozele vin din bucket (import automat); poți încărca manual poze pentru produsele fără poză.</p>
      </div>
      <form className="flex flex-wrap items-center gap-3 text-sm">
        <input name="q" defaultValue={q} placeholder="SKU sau denumire" className="h-9 w-64 rounded-md border border-input bg-background px-3 shadow-sm" />
        <label className="flex items-center gap-2"><input type="checkbox" name="noimg" value="1" defaultChecked={noimg} /> Doar fără poză</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="inactive" value="1" defaultChecked={inactive} /> Doar inactive</label>
        <button className="h-9 rounded-md bg-primary px-4 text-primary-foreground">Caută</button>
        <a href="/api/commerce/images/missing" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline"><Download className="h-4 w-4" /> Export CSV produse fără poză</a>
      </form>
      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-muted-foreground"><th className="p-3 w-16">Poză</th><th className="p-3">SKU</th><th className="p-3">Denumire</th><th className="p-3">Poze</th></tr></thead>
          <tbody>
            {list.map((r) => {
              const u = r.key ? imageUrl(r.key) : null
              return (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3">{u ? <img src={u} alt="" loading="lazy" className="h-10 w-10 rounded object-cover" /> : <div className="h-10 w-10 rounded border border-dashed" />}</td>
                  <td className="p-3 font-mono"><Link className="text-primary hover:underline" href={`/commerce/products/${r.id}`}>{r.sku}</Link></td>
                  <td className="p-3">{r.name ?? "—"}{!r.active && <Badge variant="destructive" className="ml-2">inactiv</Badge>}</td>
                  <td className="p-3">{Number(r.n) > 0 ? <Badge variant="secondary">{String(r.n)}</Badge> : <Badge variant="destructive">fără</Badge>}</td>
                </tr>
              )
            })}
            {list.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Niciun produs.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
      <div className="flex gap-3 text-sm">
        {page > 1 && <Link className="text-primary hover:underline" href={qs(page - 1)}>← Înapoi</Link>}
        <span className="text-muted-foreground">Pagina {page}</span>
        {more && <Link className="text-primary hover:underline" href={qs(page + 1)}>Înainte →</Link>}
      </div>
    </div>
  )
}
