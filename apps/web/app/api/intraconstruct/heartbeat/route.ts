// ═══════════════════════════════════════════════════════
// Agency-OS — Heartbeat Receiver
// ═══════════════════════════════════════════════════════
// Receives health reports from remote IntraConstruct-ERP
// instances every 5 minutes. Updates instance status and
// decrements credits based on reported usage.
//
// Auth: X-License-Key header

import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

interface HeartbeatPayload {
  version?: string
  uptime?: number
  dbSize?: string
  activeUsers?: number
  lastActivity?: string

  // Usage since last heartbeat
  aiTokensUsed?: number
  smsUsed?: number
  voiceMinutes?: number
  callMinutes?: number

  // System health
  cpuPercent?: number
  memoryPercent?: number
  diskPercent?: number
  healthy?: boolean
  errors?: Record<string, unknown>
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

    const body = (await request.json()) as HeartbeatPayload

    // Record heartbeat
    await db.tenantHeartbeat.create({
      data: {
        instanceId: instance.id,
        version: body.version || null,
        uptime: body.uptime || null,
        dbSize: body.dbSize || null,
        activeUsers: body.activeUsers || null,
        lastActivity: body.lastActivity ? new Date(body.lastActivity) : null,
        aiTokensUsed: body.aiTokensUsed || 0,
        smsUsed: body.smsUsed || 0,
        voiceMinutes: body.voiceMinutes || 0,
        callMinutes: body.callMinutes || 0,
        cpuPercent: body.cpuPercent ?? null,
        memoryPercent: body.memoryPercent ?? null,
        diskPercent: body.diskPercent ?? null,
        healthy: body.healthy ?? true,
        errors: body.errors || undefined,
      },
    })

    // Update instance metadata
    await db.tenantInstance.update({
      where: { id: instance.id },
      data: {
        lastHeartbeat: new Date(),
        version: body.version || undefined,
        status: body.healthy === false ? "offline" : "active",
      },
    })

    // Return current license + credits for the instance to cache
    return NextResponse.json({
      ack: true,
      status: instance.status,
      credits: {
        ai: instance.creditsAi,
        sms: instance.creditsSms,
        voice: instance.creditsVoice,
        calls: instance.creditsCalls,
      },
    })
  } catch (error: any) {
    console.error("[Heartbeat] Error:", error.message)
    return NextResponse.json(
      { error: "Heartbeat processing failed" },
      { status: 500 }
    )
  }
}
