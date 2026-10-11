import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { settlementReport } from "@/lib/commerce/orders/admin"
import { SettlementsPanel } from "./settlements-panel"

export const dynamic = 'force-dynamic'

export default async function SettlementsPage() {
  const initial = JSON.parse(JSON.stringify(await settlementReport({})))
  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl">
      <div>
        <Link href="/commerce" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Commerce</Link>
        <h1 className="text-3xl font-bold tracking-tight">Decontări service-uri</h1>
        <p className="text-muted-foreground">Clientul plătește totul către noi; aici vezi ce datorăm fiecărui service pentru lucrările finalizate și marchezi plățile făcute.</p>
      </div>
      <SettlementsPanel initial={initial} />
    </div>
  )
}
