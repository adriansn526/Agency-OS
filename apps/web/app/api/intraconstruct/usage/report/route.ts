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
        balanceCredits: true,
        
        
        
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
    if (decrements.ai > instance.balanceCredits) insufficient.push("ai")
    if (decrements.sms > 0) insufficient.push("sms")
    if (decrements.voice > 0) insufficient.push("voice")
    if (decrements.calls > 0) insufficient.push("calls")

    if (insufficient.length > 0) {
      return NextResponse.json({
        error: "Insufficient credits",
        insufficient,
        current: {
          ai: instance.balanceCredits,
          sms: 0,
          voice: 0,
          calls: 0,
        },
      }, { status: 402 })
    }

    // Atomic: decrement credits + create usage logs
    await db.$transaction([
      // Decrement balances
      db.tenantInstance.update({
        where: { id: instance.id },
        data: {
          balanceCredits: { decrement: decrements.ai + decrements.sms + decrements.voice + decrements.calls },
          
          
          
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
        balanceCredits: true,
        
        
        
      },
    })

    return NextResponse.json({
      success: true,
      reported: reports.length,
      credits: {
        ai: updated?.balanceCredits ?? 0,
        sms: 0 ?? 0,
        voice: 0 ?? 0,
        calls: 0 ?? 0,
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
