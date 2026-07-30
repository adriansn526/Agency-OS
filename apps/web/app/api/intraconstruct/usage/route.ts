// ═══════════════════════════════════════════════════════
// Agency-OS Proxy — IntraConstruct Usage Overview
// ═══════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { icApi } from "@/lib/integrations/intraconstruct"

// ─── GET /api/intraconstruct/usage ───
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await icApi.getUsageOverview()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[proxy/intraconstruct/usage] GET error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to fetch usage data" },
      { status: 502 }
    )
  }
}
