import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getTrends, SCORE_FORMULA, VEHICLE_SCORE_FORMULA, type ProductRow, type VehicleScoreRow } from "@/lib/commerce/trends"
import { PriceChart, StockChart } from "./trends-chart"

export const dynamic = 'force-dynamic'

const n = (v: number) => v.toLocaleString("ro-RO")
const ron = (v: number) => new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(v)

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </CardContent></Card>
  )
}

function VehicleTable({ rows, showModel, showYears, empty }: { rows: VehicleScoreRow[]; showModel: boolean; showYears: boolean; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.score))
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-muted-foreground">
          <th className="p-2">Marcă</th>{showModel && <th className="p-2">Model</th>}{showYears && <th className="p-2">An</th>}
          <th className="p-2 text-right">Produse</th><th className="p-2 text-right">Vizualizări</th><th className="p-2 text-right">Comandate</th><th className="p-2 text-right">Scor</th><th className="p-2 w-32"></th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="p-2 font-medium">{r.make}</td>{showModel && <td className="p-2">{r.model}</td>}{showYears && <td className="p-2 whitespace-nowrap text-muted-foreground">{r.years}</td>}
              <td className="p-2 text-right">{n(r.products)}</td><td className="p-2 text-right">{n(r.views)}</td><td className="p-2 text-right">{n(r.ordered)}</td>
              <td className="p-2 text-right font-medium">{n(r.score)}</td>
              <td className="p-2"><div className="h-2 rounded bg-primary/70" style={{ width: `${Math.max(3, (r.score / max) * 100)}%` }} /></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

function ProductTable({ rows, empty }: { rows: ProductRow[]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b text-left text-muted-foreground">
          <th className="p-2">Produs</th><th className="p-2">Marcă</th><th className="p-2">Model</th><th className="p-2">An</th><th className="p-2 text-right">Scor</th><th className="p-2 text-right">Vizualizări</th><th className="p-2 text-right">Comandate</th>
          <th className="p-2 text-right">Epuizări</th><th className="p-2 text-right">Reaprov.</th><th className="p-2">Acum</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="p-2"><Link className="text-primary hover:underline" href={`/commerce/products/${r.id}`}><span className="font-mono">{r.sku}</span></Link> <span className="text-muted-foreground">{r.name?.slice(0, 48)}</span>{!r.isActive && <Badge variant="destructive" className="ml-2">inactiv</Badge>}</td>
              <td className="p-2" title={r.vehicle?.makeFull}>{r.vehicle?.make ?? "—"}</td>
              <td className="p-2 max-w-[10rem]" title={r.vehicle?.modelFull}>{r.vehicle?.model ?? "—"}</td>
              <td className="p-2 whitespace-nowrap text-muted-foreground">{r.vehicle?.years ?? "—"}</td>
              <td className="p-2 text-right font-medium">{n(r.score)}</td>
              <td className="p-2 text-right">{n(r.views)}</td>
              <td className="p-2 text-right">{n(r.ordered)}</td>
              <td className="p-2 text-right">{n(r.outs)}</td>
              <td className="p-2 text-right">{n(r.backs)}</td>
              <td className="p-2">{r.available == null ? "—" : r.available ? <Badge variant="secondary">disponibil</Badge> : <Badge variant="destructive">epuizat</Badge>}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-muted-foreground">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30
  const t = await getTrends(days)
  const noHistory = t.totals.went_out + t.totals.back + t.totals.priceChanges === 0

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <Link href="/commerce" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Commerce</Link>
        <h1 className="text-3xl font-bold tracking-tight">Stoc, prețuri și cerere</h1>
        <p className="text-muted-foreground">Cum se mișcă disponibilitatea la furnizor și prețurile, și ce produse atrag cererea.</p>
        <div className="mt-3 flex gap-2 text-sm">
          {[7, 30, 90].map((d) => <Link key={d} href={`?days=${d}`} className={`rounded-md border px-3 py-1 ${d === days ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{d} zile</Link>)}
        </div>
      </div>

      {noHistory && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          Încă nu există modificări înregistrate{t.historyStart ? "" : " (jurnalul pornește de la prima actualizare reală de stoc sau preț)"}. Graficele se umplu pe măsură ce sincronizarea cu furnizorul scrie modificări; vizualizările și căutările se numără din storefront.
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Kpi label="Epuizate la furnizor" value={n(t.totals.went_out)} hint={`${n(t.totals.productsAffected)} produse afectate`} />
        <Kpi label="Reaprovizionate" value={n(t.totals.back)} />
        <Kpi label="Prețuri schimbate" value={n(t.totals.priceChanges)} />
        <Kpi label="Vizualizări / căutări" value={`${n(t.totals.views)} / ${n(t.totals.searches)}`} hint={`${n(t.totals.orderedUnits)} unități comandate`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Mișcări de stoc pe zi</CardTitle></CardHeader>
        <CardContent><StockChart data={t.daily} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Cele mai cerute produse</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          <p className="text-xs text-muted-foreground">Scor = {SCORE_FORMULA}. Vizualizările sunt cererile storefront-ului către API și includ și roboții. Epuizarea la furnizor arată ce se vinde bine la toți clienții lui, nu doar la noi.</p>
          <ProductTable rows={t.byScore} empty="Nu există încă date de cerere în această perioadă." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Cerere pe marcă, model și an</CardTitle></CardHeader>
        <CardContent className="grid gap-6">
          <p className="text-xs text-muted-foreground">
            Scor = {VEHICLE_SCORE_FORMULA}. „An” este intervalul de ani al generației. Scorurile însumează cererea reală pentru piesele care au mașini asociate
            ({n(t.vehicles.attributedScore)} puncte); {n(t.vehicles.unattributedScore)} puncte vin de la produse fără mașini asociate și nu apar mai jos.
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <div><div className="mb-1 text-sm font-medium">Pe marcă</div><VehicleTable rows={t.vehicles.byMake} showModel={false} showYears={false} empty="Nu există încă date de cerere în această perioadă." /></div>
            <div><div className="mb-1 text-sm font-medium">Pe model</div><VehicleTable rows={t.vehicles.byModel} showModel showYears empty="Nu există încă date de cerere în această perioadă." /></div>
          </div>
          <div><div className="mb-1 text-sm font-medium">Pe model și generație (an)</div><VehicleTable rows={t.vehicles.byGeneration} showModel showYears empty="Nu există încă date de cerere în această perioadă." /></div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Produse cu cele mai multe mișcări de stoc</CardTitle></CardHeader>
          <CardContent><ProductTable rows={t.byFlips} empty="Nicio mișcare de stoc în această perioadă." /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Cele mai căutate termeni</CardTitle></CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm">
              {t.searches.map((s) => <li key={s.term} className="flex justify-between border-b py-1 last:border-0"><span>{s.term}</span><span className="text-muted-foreground">{n(s.n)}</span></li>)}
              {t.searches.length === 0 && <li className="text-muted-foreground">Nicio căutare înregistrată.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Prețuri</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <PriceChart data={t.daily} />
          <div className="text-xs text-muted-foreground">Cele mai mari variații în perioadă:</div>
          <ul className="grid gap-1 text-sm">
            {t.priceMoves.map((m, i) => (
              <li key={i} className="flex flex-wrap gap-x-3"><span className="font-mono">{m.sku}</span><span className="text-muted-foreground">{m.name?.slice(0, 50)}</span><span>{ron(m.oldPrice)} → <b>{ron(m.newPrice)}</b> ({m.pct > 0 ? "+" : ""}{m.pct}%)</span><span className="text-xs text-muted-foreground">{new Date(m.at).toLocaleDateString("ro-RO")}</span></li>
            ))}
            {t.priceMoves.length === 0 && <li className="text-muted-foreground">Nicio variație de preț.</li>}
          </ul>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{t.historyStart ? `Istoric de stoc și preț disponibil din ${new Date(t.historyStart).toLocaleDateString("ro-RO")}.` : "Istoricul de stoc și preț începe de la prima modificare reală."}</p>
    </div>
  )
}
