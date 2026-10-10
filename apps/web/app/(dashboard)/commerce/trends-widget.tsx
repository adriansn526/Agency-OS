import Link from "next/link"
import { Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getTrends } from "@/lib/commerce/trends"

const n = (v: number) => v.toLocaleString("ro-RO")

/** Dashboard widget: last 7 days of stock movement and the top-demand products. Never breaks the page if the journal is unavailable. */
export async function TrendsWidget() {
  let t
  try { t = await getTrends(7, 3) } catch { return null }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Stoc și cerere (7 zile)</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <div><b className="text-red-600">{n(t.totals.went_out)}</b> epuizate · <b className="text-green-600">{n(t.totals.back)}</b> reaprovizionate · {n(t.totals.priceChanges)} prețuri schimbate</div>
        {t.byScore.length > 0 && (
          <ul className="text-xs text-muted-foreground">
            {t.byScore.map((p) => <li key={p.id}><span className="font-mono">{p.sku}</span> {p.name?.slice(0, 32)} · scor {n(p.score)}</li>)}
          </ul>
        )}
        <Link href="/commerce/trends" className="text-primary hover:underline text-xs">Vezi tendințele →</Link>
      </CardContent>
    </Card>
  )
}
