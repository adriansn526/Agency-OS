// ═══════════════════════════════════════════════════════
// Agency-OS Proxy — Single Tenant Operations
// ═══════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { icApi } from "@/lib/integrations/intraconstruct"

interface RouteParams {
  params: Promise<{ id: string }>
}

// ─── GET /api/intraconstruct/tenants/[id] ───
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const data = await icApi.getTenant(id)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[proxy/intraconstruct/tenants/[id]] GET error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to fetch tenant" },
      { status: 502 }
    )
  }
}

// ─── PATCH /api/intraconstruct/tenants/[id] ───
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const data = await icApi.updateTenant(id, body)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[proxy/intraconstruct/tenants/[id]] PATCH error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to update tenant" },
      { status: 502 }
    )
  }
}

// ─── DELETE /api/intraconstruct/tenants/[id] ───
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const data = await icApi.suspendTenant(id)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[proxy/intraconstruct/tenants/[id]] DELETE error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to suspend tenant" },
      { status: 502 }
    )
  }
}
