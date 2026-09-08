import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

export async function POST(req: NextRequest) {
  try {
    const licenseKey = req.headers.get("x-license-key")
    if (!licenseKey) {
      return NextResponse.json({ error: "Missing license key" }, { status: 401 })
    }

    const instance = await db.tenantInstance.findUnique({
      where: { licenseKey },
    })

    if (!instance) {
      return NextResponse.json({ error: "Invalid license key" }, { status: 403 })
    }

    const body = await req.json()
    const { channel, provider, model, usage } = body
    // usage could have { promptTokens, completionTokens, voiceMinutes, whatsappMessages }

    if (!usage) {
      return NextResponse.json({ error: "Missing usage details" }, { status: 400 })
    }

    // Determine the service rule based on channel
    let serviceName = ""
    let consumedUnits = 0

    if (channel === "voice") {
      serviceName = "openai_rtc"
      consumedUnits = usage.voiceMinutes || 0
    } else if (channel === "whatsapp") {
      serviceName = "whatsapp"
      consumedUnits = usage.whatsappMessages || 0
    } else {
      // Default to chat
      serviceName = "gpt4o_tokens_1m"
      const totalTokens = (usage.promptTokens || 0) + (usage.completionTokens || 0)
      consumedUnits = totalTokens / 1_000_000
    }

    if (consumedUnits <= 0) {
      return NextResponse.json({ success: true, deducted: 0 })
    }

    // Fetch the pricing rule
    const rule = await db.creditPricingRule.findUnique({
      where: { serviceName }
    })

    if (!rule) {
      return NextResponse.json({ error: `Pricing rule for ${serviceName} not found` }, { status: 404 })
    }

    // Calculate credits to deduct (round up to nearest integer)
    let creditsToDeduct = Math.ceil(consumedUnits * rule.creditsPerUnit)
    
    // For tokens, since consumedUnits is fraction of millions, we might get 0 if it's too small and not rounding up correctly, but Math.ceil handles 0.001 -> 1
    // Actually, if we have 100 credits per 1M, and we use 10,000 tokens (0.01M), that's 1 credit.
    
    // Special case for tokens to ensure fair billing (if less than 1 credit, round to 1)
    if (channel === "chat") {
      const totalTokens = (usage.promptTokens || 0) + (usage.completionTokens || 0)
      creditsToDeduct = Math.max(1, Math.ceil((totalTokens / 1_000_000) * rule.creditsPerUnit))
    }

    // Optional: We can block if balance is insufficient
    if (instance.balanceCredits < creditsToDeduct) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 })
    }

    // Deduct and log usage
    const [updatedInstance] = await db.$transaction([
      db.tenantInstance.update({
        where: { id: instance.id },
        data: {
          balanceCredits: { decrement: creditsToDeduct },
        }
      }),
      db.creditUsage.create({
        data: {
          instanceId: instance.id,
          type: channel,
          amount: creditsToDeduct,
          detail: `${channel} usage: ${consumedUnits.toFixed(4)} units`,
          provider: provider || "openai",
          metadata: usage,
        }
      })
    ])

    return NextResponse.json({ success: true, deducted: creditsToDeduct, newBalance: updatedInstance.balanceCredits })

  } catch (error: any) {
    console.error("[Agency-OS Tenant Deduct] Error:", error.message)
    return NextResponse.json({ error: "Failed to deduct credits" }, { status: 500 })
  }
}
