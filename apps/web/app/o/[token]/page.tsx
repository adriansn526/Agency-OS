import { notFound } from "next/navigation"
import { db } from "@repo/db"
import PublicOfferClient from "./client"

export default async function PublicOfferPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Fetch delivery and offer
  const delivery = await db.offerDelivery.findUnique({
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

  if (!delivery || !delivery.offer) {
    notFound()
  }

  // Check if expired
  if (delivery.expiresAt && delivery.expiresAt < new Date()) {
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

  // Record view logic
  // Update totalViews and lastOpenedAt. If firstOpenedAt is null, set it.
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

  // We need company details from CompanySettings matching the business line
  const companySettings = await db.companySettings.findUnique({
    where: { businessLineId: delivery.offer.businessLineId },
  })

  return (
    <PublicOfferClient
      delivery={delivery}
      offer={delivery.offer}
      companySettings={companySettings}
    />
  )
}
