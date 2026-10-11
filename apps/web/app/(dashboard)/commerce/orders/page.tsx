import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { listOrders } from "@/lib/commerce/orders/admin"
import { OrdersPanel } from "./orders-panel"

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const initial = JSON.parse(JSON.stringify(await listOrders({})))
  return (
    <div className="flex flex-col gap-6 p-8 max-w-6xl">
      <div>
        <Link href="/commerce" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Commerce</Link>
        <h1 className="text-3xl font-bold tracking-tight">Comenzi</h1>
        <p className="text-muted-foreground">Comenzile din storefront, inclusiv cele cu vopsire sau montaj la service partener.</p>
      </div>
      <OrdersPanel initial={initial} />
    </div>
  )
}
