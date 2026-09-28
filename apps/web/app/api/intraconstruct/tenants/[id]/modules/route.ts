// ═══════════════════════════════════════════════════════
// Agency-OS Proxy — Tenant Module Management
// ═══════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { icApi } from "@/lib/integrations/intraconstruct"

interface RouteParams {
  params: Promise<{ id: string }>
}

// ─── GET /api/intraconstruct/tenants/[id]/modules ───
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    
    // Check if it's a dedicated Single-Tenant instance
    const db = (await import("@repo/db")).db
    const instance = await db.tenantInstance.findUnique({ where: { tenantId: id } })
    
    if (instance && instance.apiEndpoint && instance.internalApiKey) {
      // Proxy dynamically to the dedicated server
      const url = `${instance.apiEndpoint}/api/internal/tenants/${encodeURIComponent(id)}/modules`
      const res = await fetch(url, {
        headers: { "x-internal-api-key": instance.internalApiKey }
      })
      if (!res.ok) throw new Error(`Dedicated ERP returned ${res.status}`)
      const data = await res.json()
      return NextResponse.json(data)
    }

    const data = await icApi.getModules(id)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[proxy/intraconstruct/tenants/[id]/modules] GET error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to fetch modules" },
      { status: 502 }
    )
  }
}

// ─── PATCH /api/intraconstruct/tenants/[id]/modules ───
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    if (!Array.isArray(body.updates)) {
      return NextResponse.json(
        { error: "Body must contain 'updates' array" },
        { status: 400 }
      )
    }

    // Check if it's a dedicated Single-Tenant instance
    const db = (await import("@repo/db")).db
    const instance = await db.tenantInstance.findUnique({ where: { tenantId: id } })
    
    if (instance && instance.apiEndpoint && instance.internalApiKey) {
      // Proxy dynamically to the dedicated server
      const url = `${instance.apiEndpoint}/api/internal/tenants/${encodeURIComponent(id)}/modules`
      const res = await fetch(url, {
        method: "PATCH",
        headers: { 
          "x-internal-api-key": instance.internalApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error(`Dedicated ERP returned ${res.status}`)
      const data = await res.json()
      return NextResponse.json(data)
    }

    const data = await icApi.updateModules(id, body.updates)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[proxy/intraconstruct/tenants/[id]/modules] PATCH error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to update modules" },
      { status: 502 }
    )
  }
}
