import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { db } from "@repo/db"
import { parsePriceSyncSettings } from "@/lib/commerce/sync/settings"
import { ChannelSettingsForm } from "./channel-settings-form"

export const dynamic = 'force-dynamic'

export default async function ChannelSettingsPage({ params }: { params: Promise<{ businessLineId: string }> }) {
  const { businessLineId } = await params
  const channel = await db.commerceChannel.findUnique({ where: { businessLineId }, include: { businessLine: { select: { name: true } } } })
  if (!channel) notFound()

  const [listings, priced, eur] = await Promise.all([
    db.commerceListing.count({ where: { businessLineId, isActive: true } }),
    db.commerceListing.aggregate({ where: { businessLineId }, _max: { priceUpdatedAt: true } }),
    db.commerceExchangeRate.findFirst({ where: { currency: 'EUR' }, orderBy: { date: 'desc' } }),
  ])

  return (
    <div className="flex flex-col gap-6 p-8 max-w-3xl">
      <div>
        <Link href="/commerce" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Commerce
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Setări canal — {channel.businessLine.name}</h1>
        <p className="text-muted-foreground">Parametrii cu care se calculează prețurile din catalog (cost EUR × curs BNR → RON cu TVA).</p>
      </div>
      {parsePriceSyncSettings(channel.config).enabled && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          Prețurile sunt gestionate de <Link href="/commerce/sync" className="font-medium underline">sincronizarea cu furnizorul</Link>: regulile de preț și recalcularea de aici nu mai modifică prețurile din catalog.
        </div>
      )}
      <Link href={`/commerce/${businessLineId}/rules`} className="text-sm text-primary hover:underline">Reguli de preț (pe categorie, brand, calitate, interval de cost) →</Link>
      <ChannelSettingsForm
        businessLineId={businessLineId}
        initial={{
          isEnabled: channel.isEnabled,
          storefrontUrl: channel.storefrontUrl ?? "",
          vatRate: Number(channel.vatRate),
          transportPct: Number(channel.transportPct),
          defaultMarkupPct: Number(channel.defaultMarkupPct),
          minMarginRon: Number(channel.minMarginRon),
          roundingMode: channel.roundingMode,
        }}
        eurRate={eur ? Number(eur.rate) : null}
        eurRateDate={eur ? eur.date.toISOString().slice(0, 10) : null}
        activeListings={listings}
        lastPriceUpdate={priced._max.priceUpdatedAt ? priced._max.priceUpdatedAt.toISOString() : null}
      />
    </div>
  )
}
