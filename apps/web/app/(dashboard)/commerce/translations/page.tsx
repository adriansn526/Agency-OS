import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { db } from "@repo/db"
import { Card, CardContent } from "@/components/ui/card"
import { TranslationsTable, type TranslationRow } from "./translations-table"

export const dynamic = 'force-dynamic'
const PAGE = 50
const STATUSES = { pending: "Neaprobate", reviewed: "Aprobate", manual: "Editate manual", all: "Toate" } as const
type Status = keyof typeof STATUSES

export default async function CommerceTranslations({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams
  const q = (sp.q ?? "").trim().slice(0, 80)
  const status: Status = sp.status && sp.status in STATUSES ? (sp.status as Status) : "pending"
  const page = Math.max(1, Math.min(10000, Number(sp.page) || 1))
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`

  const stats = await db.$queryRaw<Array<{ total: bigint; reviewed: bigint; manual: bigint }>>`
    SELECT count(*) AS total, count(*) FILTER (WHERE reviewed) AS reviewed, count(*) FILTER (WHERE source = 'manual') AS manual
    FROM "CommerceTranslation" WHERE "targetLang" = 'ro'`
  const s = stats[0]

  const rows = await db.$queryRaw<Array<{ id: string; hash: string; sourceText: string; text: string; source: string; reviewed: boolean }>>`
    SELECT id, hash, "sourceText", text, source, reviewed FROM "CommerceTranslation"
    WHERE "targetLang" = 'ro'
      AND (${q} = '' OR "sourceText" ILIKE ${like} OR text ILIKE ${like})
      AND (${status} = 'all' OR (${status} = 'pending' AND NOT reviewed) OR (${status} = 'reviewed' AND reviewed) OR (${status} = 'manual' AND source = 'manual'))
    ORDER BY "sourceText" LIMIT ${PAGE + 1} OFFSET ${(page - 1) * PAGE}`
  const more = rows.length > PAGE
  const list = rows.slice(0, PAGE)

  const counts = list.length
    ? await db.$queryRaw<Array<{ h: string; n: bigint }>>`
        SELECT md5(lower("nameEn")) AS h, count(*) AS n FROM "CommerceProduct"
        WHERE md5(lower("nameEn")) = ANY(${list.map((r) => r.hash)}) GROUP BY 1`
    : []
  const nByHash = new Map(counts.map((c) => [c.h, Number(c.n)]))
  const data: TranslationRow[] = list.map((r) => ({ id: r.id, sourceText: r.sourceText, text: r.text, source: r.source, reviewed: r.reviewed, products: nByHash.get(r.hash) ?? 0 }))

  const qs = (p: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), status, page: String(p) })}`

  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl">
      <div>
        <Link href="/commerce" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Commerce</Link>
        <h1 className="text-3xl font-bold tracking-tight">Revizuire traduceri</h1>
        <p className="text-muted-foreground">
          Denumirile produselor traduse automat din engleză. O corecție se aplică tuturor produselor cu aceeași denumire; adresele (slug) rămân neschimbate.
          {" "}{Number(s?.reviewed ?? 0).toLocaleString("ro-RO")} aprobate din {Number(s?.total ?? 0).toLocaleString("ro-RO")} ({Number(s?.manual ?? 0)} editate manual).
        </p>
      </div>
      <form className="flex flex-wrap items-center gap-3 text-sm">
        <input name="q" defaultValue={q} placeholder="Caută în engleză sau română" className="h-9 w-72 rounded-md border border-input bg-background px-3 shadow-sm" />
        <select name="status" defaultValue={status} className="h-9 rounded-md border border-input bg-background px-3 shadow-sm">
          {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="h-9 rounded-md bg-primary px-4 text-primary-foreground">Caută</button>
      </form>
      <Card><CardContent className="p-0">
        <TranslationsTable key={`${q}|${status}|${page}`} rows={data} />
      </CardContent></Card>
      <div className="flex gap-3 text-sm">
        {page > 1 && <Link className="text-primary hover:underline" href={qs(page - 1)}>← Înapoi</Link>}
        <span className="text-muted-foreground">Pagina {page}</span>
        {more && <Link className="text-primary hover:underline" href={qs(page + 1)}>Înainte →</Link>}
      </div>
    </div>
  )
}
