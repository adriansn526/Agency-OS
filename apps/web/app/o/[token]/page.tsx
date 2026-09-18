import { notFound } from "next/navigation"
export const dynamic = "force-dynamic"
import { db } from "@repo/db"
import PublicOfferClient from "./client"

export default async function PublicOfferPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Try to find delivery by token
  let delivery = await db.offerDelivery.findUnique({
    where: { token },
    include: {
      offer: {
        include: {
          client: true,
          businessLine: true,
        },
      },
    },
  })

  let offer = delivery?.offer || null

  // Fallback: If not found, maybe the token is an offer ID (preview mode from dashboard)
  if (!delivery) {
    offer = await db.offer.findUnique({
      where: { id: token },
      include: {
        client: true,
        businessLine: true,
      },
    }) as any

    if (!offer) {
      notFound()
    }

    // Create a mock delivery for preview mode
    delivery = {
      id: 'preview',
      token,
      offerId: offer.id,
      trackingEnabled: false,
      clientResponse: null,
      totalViews: 0,
      firstOpenedAt: null,
      lastOpenedAt: null,
      expiresAt: offer.validUntil,
      createdAt: new Date(),
      updatedAt: new Date(),
      offer: offer,
    } as any
  }

  // Check if expired
  if (delivery?.expiresAt && delivery.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
        <div className="max-w-md w-full bg-surface border border-border p-6 rounded-2xl">
          <h1 className="text-xl font-bold text-destructive mb-2">Oferta a expirat</h1>
          <p className="text-sm text-muted-foreground">
            Această ofertă a expirat la {delivery.expiresAt.toLocaleDateString("ro-RO")}. Te rugăm să ne contactezi pentru o ofertă actualizată.
          </p>
        </div>
      </div>
    )
  }

  // Record view logic (only if not preview)
  if (delivery && delivery.id !== 'preview') {
    try {
      await db.offerDelivery.update({
        where: { id: delivery.id },
        data: {
          totalViews: { increment: 1 },
          lastOpenedAt: new Date(),
          ...(delivery.firstOpenedAt ? {} : { firstOpenedAt: new Date() }),
        },
      })
    } catch (err) {
      console.error("Failed to update offer views:", err)
    }
  }

  // We need company details from CompanySettings
  const companySettings = await db.companySettings.findFirst()

  return (
    <PublicOfferClient
      delivery={delivery}
      offer={offer}
      companySettings={companySettings}
    />
  )
}
