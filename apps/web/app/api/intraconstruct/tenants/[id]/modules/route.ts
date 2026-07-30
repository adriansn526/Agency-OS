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
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
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
    if (!session?.user?.id || session.user.role !== "admin") {
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
