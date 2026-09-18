import { NextResponse } from "next/server"
import { db } from "@repo/db"

// Simple in-memory rate limiting map for IPs
const ipRequests = new Map<string, { count: number; timestamp: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5

export async function POST(req: Request) {
  try {
    // Basic rate limiting
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
    const now = Date.now()
    const reqData = ipRequests.get(ip) || { count: 0, timestamp: now }

    if (now - reqData.timestamp < RATE_LIMIT_WINDOW_MS) {
      if (reqData.count >= MAX_REQUESTS_PER_WINDOW) {
        return NextResponse.json({ error: "Prea multe cereri. Încearcă din nou mai târziu." }, { status: 429 })
      }
      reqData.count++
    } else {
      reqData.count = 1
      reqData.timestamp = now
    }
    ipRequests.set(ip, reqData)

    const body = await req.json()
    const { token, name, email } = body

    if (!token || !name || !email) {
      return NextResponse.json({ error: "Date incomplete" }, { status: 400 })
    }

    const delivery = await db.offerDelivery.findUnique({
      where: { token },
      include: { offer: true },
    })

    if (!delivery || !delivery.offer) {
      return NextResponse.json({ error: "Oferta nu a fost găsită" }, { status: 404 })
    }

    if (delivery.expiresAt && delivery.expiresAt < new Date()) {
      return NextResponse.json({ error: "Oferta a expirat" }, { status: 400 })
    }

    if (delivery.clientResponse === "accepted") {
      return NextResponse.json({ message: "Oferta este deja acceptată" })
    }

    const userAgent = req.headers.get("user-agent") || "unknown"

    // Transaction to update offer, delivery, and create event
    await db.$transaction(async (tx) => {
      // 1. Update delivery
      await tx.offerDelivery.update({
        where: { id: delivery.id },
        data: {
          clientResponse: "accepted",
          clientResponseAt: new Date(),
          clientMessage: `Semnat electronic de ${name} (${email})`,
        },
      })

      // 2. Update offer
      await tx.offer.update({
        where: { id: delivery.offerId },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
        },
      })

      // 3. Create Event
      await tx.offerEvent.create({
        data: {
          deliveryId: delivery.id,
          type: "signed",
          ip,
          userAgent,
          metadata: {
            signerName: name,
            signerEmail: email,
          },
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error accepting offer:", error)
    return NextResponse.json({ error: "Eroare internă la acceptarea ofertei" }, { status: 500 })
  }
}
