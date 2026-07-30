// ═══════════════════════════════════════════════════════
// Agency-OS — Usage Report API
// ═══════════════════════════════════════════════════════
// Called by remote IntraConstruct-ERP instances to report
// credit consumption. Decrements credit balances.
//
// Auth: X-License-Key header

import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

interface UsageReport {
  type: "ai" | "sms" | "voice" | "calls"
  amount: number // credits consumed
  detail?: string // 'copilot_chat', 'sms_notification', etc.
  provider?: string // 'gemini', 'openai', 'smso', 'telnyx'
  rawCostUsd?: number
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const licenseKey = request.headers.get("x-license-key")
    if (!licenseKey) {
      return NextResponse.json({ error: "Missing license key" }, { status: 401 })
    }

    const instance = await db.tenantInstance.findUnique({
      where: { licenseKey },
      select: {
        id: true,
        status: true,
        creditsAi: true,
        creditsSms: true,
        creditsVoice: true,
        creditsCalls: true,
      },
    })

    if (!instance) {
      return NextResponse.json({ error: "Invalid license key" }, { status: 403 })
    }

    if (instance.status === "suspended") {
      return NextResponse.json({ error: "Instance suspended" }, { status: 403 })
    }

    const body = await request.json() as UsageReport | UsageReport[]
    const reports = Array.isArray(body) ? body : [body]

    // Validate
    for (const r of reports) {
      if (!r.type || !r.amount || r.amount <= 0) {
        return NextResponse.json(
          { error: "Each report needs type and positive amount" },
          { status: 400 }
        )
      }
      if (!["ai", "sms", "voice", "calls"].includes(r.type)) {
        return NextResponse.json(
          { error: `Invalid type: ${r.type}` },
          { status: 400 }
        )
      }
    }

    // Calculate decrements
    const decrements = { ai: 0, sms: 0, voice: 0, calls: 0 }
    for (const r of reports) {
      decrements[r.type] += r.amount
    }

    // Check sufficient credits
    const insufficient: string[] = []
    if (decrements.ai > instance.creditsAi) insufficient.push("ai")
    if (decrements.sms > instance.creditsSms) insufficient.push("sms")
    if (decrements.voice > instance.creditsVoice) insufficient.push("voice")
    if (decrements.calls > instance.creditsCalls) insufficient.push("calls")

    if (insufficient.length > 0) {
      return NextResponse.json({
        error: "Insufficient credits",
        insufficient,
        current: {
          ai: instance.creditsAi,
          sms: instance.creditsSms,
          voice: instance.creditsVoice,
          calls: instance.creditsCalls,
        },
      }, { status: 402 })
    }

    // Atomic: decrement credits + create usage logs
    await db.$transaction([
      // Decrement balances
      db.tenantInstance.update({
        where: { id: instance.id },
        data: {
          creditsAi: { decrement: decrements.ai },
          creditsSms: { decrement: decrements.sms },
          creditsVoice: { decrement: decrements.voice },
          creditsCalls: { decrement: decrements.calls },
        },
      }),
      // Create usage log entries
      ...reports.map((r) =>
        db.creditUsage.create({
          data: {
            instanceId: instance.id,
            type: r.type,
            amount: r.amount,
            detail: r.detail || null,
            provider: r.provider || null,
            rawCostUsd: r.rawCostUsd || null,
            metadata: r.metadata || undefined,
          },
        })
      ),
    ])

    // Return updated balances
    const updated = await db.tenantInstance.findUnique({
      where: { id: instance.id },
      select: {
        creditsAi: true,
        creditsSms: true,
        creditsVoice: true,
        creditsCalls: true,
      },
    })

    return NextResponse.json({
      success: true,
      reported: reports.length,
      credits: {
        ai: updated?.creditsAi ?? 0,
        sms: updated?.creditsSms ?? 0,
        voice: updated?.creditsVoice ?? 0,
        calls: updated?.creditsCalls ?? 0,
      },
    })
  } catch (error: any) {
    console.error("[Usage Report] Error:", error.message)
    return NextResponse.json(
      { error: "Usage report failed" },
      { status: 500 }
    )
  }
}
