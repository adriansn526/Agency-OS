import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { loadSchedulesView } from "@/lib/commerce/scheduler/view"
import { SchedulesPanel } from "./schedules-panel"

export const dynamic = 'force-dynamic'

export default async function SchedulesPage() {
  let initial: unknown = null
  let error: string | null = null
  try { initial = JSON.parse(JSON.stringify(await loadSchedulesView())) }
  catch { error = "Tabelele planificatorului nu există încă: aplică packages/db/prisma/sql/commerce_scheduler.sql" }
  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl">
      <div>
        <Link href="/commerce" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Commerce</Link>
        <h1 className="text-3xl font-bold tracking-tight">Programări</h1>
        <p className="text-muted-foreground">Când rulează automat sincronizarea de preț și stoc, repreț-ul la cursul BNR și reîmprospătarea coordonatelor partenerilor.</p>
      </div>
      {error ? <div className="rounded-lg border border-destructive/50 p-4 text-destructive">{error}</div> : <SchedulesPanel initial={initial as never} />}
    </div>
  )
}
