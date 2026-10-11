import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { listPartners } from "@/lib/commerce/partners/service"
import { PartnersPanel } from "./partners-panel"

export const dynamic = 'force-dynamic'

export default async function PartnersPage() {
  let initial: unknown = null
  let error: string | null = null
  try {
    initial = JSON.parse(JSON.stringify(await listPartners({})))
  } catch {
    error = "Tabelele registrului nu există încă: aplică packages/db/prisma/sql/commerce_service_partners.sql"
  }
  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl">
      <div>
        <Link href="/commerce" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Commerce
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Service-uri partenere</h1>
        <p className="text-muted-foreground">Vopsire și montaj la service. Doar partenerii „activi” (cu tarife) pot fi afișați clienților.</p>
      </div>
      {error ? <div className="rounded-lg border border-destructive/50 p-4 text-destructive">{error}</div> : <PartnersPanel initial={initial as never} />}
    </div>
  )
}
