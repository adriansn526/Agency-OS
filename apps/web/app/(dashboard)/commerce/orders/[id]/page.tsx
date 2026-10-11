import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getOrder } from "@/lib/commerce/orders/admin"
import { PartnerError } from "@/lib/commerce/partners/service"
import { OrderDetail } from "./order-detail"

export const dynamic = 'force-dynamic'

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let data
  try { data = JSON.parse(JSON.stringify(await getOrder(id))) } catch (e) { if (e instanceof PartnerError) notFound(); throw e }
  return (
    <div className="flex flex-col gap-6 p-8 max-w-5xl">
      <div>
        <Link href="/commerce/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="h-4 w-4" /> Comenzi</Link>
        <h1 className="text-3xl font-bold tracking-tight">Comanda {data.order.number}</h1>
      </div>
      <OrderDetail initial={data} />
    </div>
  )
}
