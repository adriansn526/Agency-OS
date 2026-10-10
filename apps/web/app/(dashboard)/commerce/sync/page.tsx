import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSyncOverview } from "@/lib/commerce/sync/admin"
import { SyncPanel } from "./sync-panel"

export const dynamic = 'force-dynamic'

export default async function SupplierSyncPage() {
  const overview = JSON.parse(JSON.stringify(await getSyncOverview()))
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
    </div>
  )
}
