import { db } from "@repo/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store, Globe, Settings, Activity } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

export default async function CommerceDashboard() {
  const channels = await db.commerceChannel.findMany({
    orderBy: { businessLineId: 'asc' },
    include: { businessLine: { select: { name: true } } },
  })

  // Quick stats
  const totalProducts = await db.commerceProduct.count()
  const translated = await db.commerceTranslation.count({ where: { reviewed: true } })
  const activeListings = await db.commerceListing.count({ where: { isActive: true } })

  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Commerce ERP</h1>
        <p className="text-muted-foreground">Gestionează liniile de business, regulile de preț și feed-urile de produse.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produse în Feed</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total repere importate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produse Traduse</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{translated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Titluri traduse automat</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listări Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeListings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Cu preț și stoc</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-semibold">Linii de Business</h2><span className="flex gap-4"><Link href="/commerce/sync" className="text-sm text-primary hover:underline">Sincronizare preț și stoc →</Link><Link href="/commerce/products" className="text-sm text-primary hover:underline">Produse și poze →</Link></span></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {channels.map(channel => (
            <Card key={channel.businessLineId} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{channel.businessLine.name}</CardTitle>
                  <Badge variant={channel.isEnabled ? "default" : "secondary"}>
                    {channel.isEnabled ? "Activ" : "Inactiv"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <div className="flex justify-between py-1">
                    <span>Monedă implicită:</span>
                    <span className="font-medium text-foreground">RON</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Markup Implicit:</span>
                    <span className="font-medium text-foreground">{Number(channel.defaultMarkupPct)}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Transport:</span>
                    <span className="font-medium text-foreground">{Number(channel.transportPct)}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Rotunjire:</span>
                    <span className="font-medium text-foreground uppercase">{channel.roundingMode}</span>
                  </div>
                </div>
                <div className="pt-2 flex gap-2">
                  <Link href={`/commerce/${channel.businessLineId}`} className="inline-flex items-center justify-center text-sm font-medium bg-primary text-primary-foreground h-9 px-4 py-2 rounded-md hover:bg-primary/90 w-full">
                    Setări Prețuri
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
          {channels.length === 0 && (
            <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed rounded-lg">
              Nu există nicio linie de business configurată încă.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
