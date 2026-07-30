// ═══════════════════════════════════════════════════════
// Agency-OS — License Check API
// ═══════════════════════════════════════════════════════
// Called by remote IntraConstruct-ERP instances to verify
// license validity and available credits.
//
// Auth: X-License-Key header (TenantInstance.licenseKey)

import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

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
        tenantId: true,
        tenantName: true,
        tenantSlug: true,
        status: true,
        plan: true,
        gracePeriodDays: true,
        creditsAi: true,
        creditsSms: true,
        creditsVoice: true,
        creditsCalls: true,
        lastHeartbeat: true,
      },
    })

    if (!instance) {
      return NextResponse.json({ error: "Invalid license key" }, { status: 403 })
    }

    if (instance.status === "suspended") {
      return NextResponse.json({
        valid: false,
        reason: "suspended",
        plan: instance.plan,
        credits: { ai: 0, sms: 0, voice: 0, calls: 0 },
      })
    }

    return NextResponse.json({
      valid: true,
      plan: instance.plan,
      tenantId: instance.tenantId,
      tenantSlug: instance.tenantSlug,
      gracePeriodDays: instance.gracePeriodDays,
      credits: {
        ai: instance.creditsAi,
        sms: instance.creditsSms,
        voice: instance.creditsVoice,
        calls: instance.creditsCalls,
      },
      checkedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[License Check] Error:", error.message)
    return NextResponse.json(
      { error: "License check failed" },
      { status: 500 }
    )
  }
}
