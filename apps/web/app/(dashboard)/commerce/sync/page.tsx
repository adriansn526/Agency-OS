import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSyncOverview } from "@/lib/commerce/sync/admin"
import { loadSchedulesView } from "@/lib/commerce/scheduler/view"
import { SyncPanel } from "./sync-panel"
import { SchedulesPanel } from "./schedules-panel"

export const dynamic = 'force-dynamic'

export default async function SupplierSyncPage() {
  const overview = JSON.parse(JSON.stringify(await getSyncOverview()))
  // The scheduler tables are additive DDL: if they are missing the rest of the page must still work
  let schedules: unknown = null
  try { schedules = JSON.parse(JSON.stringify(await loadSchedulesView())) } catch { /* shown as a hint below */ }
  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl">
      <div>
        <Link href="/commerce" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Commerce
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Sincronizare preț și stoc</h1>
        <p className="text-muted-foreground">
          Prețurile și disponibilitatea produselor din fișierele EDI ale furnizorului (PRICELIST, OUTOFSTOCK), recalculate la cursul BNR.
        </p>
      </div>
      <SyncPanel initial={overview} />

      <section id="programari" className="flex flex-col gap-4 scroll-mt-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Programări automate</h2>
          <p className="text-muted-foreground">Când rulează singure sincronizarea de preț și stoc, repreț-ul la cursul BNR și reîmprospătarea coordonatelor partenerilor.</p>
        </div>
        {schedules
          ? <SchedulesPanel initial={schedules as never} hideRunFor={["feed_sync", "reprice"]} />
          : <div className="rounded-lg border border-destructive/50 p-4 text-destructive">Tabelele planificatorului nu există încă: aplică packages/db/prisma/sql/commerce_scheduler.sql</div>}
      </section>
    </div>
  )
}
