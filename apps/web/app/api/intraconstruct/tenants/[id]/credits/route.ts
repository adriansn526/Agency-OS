import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const instance = await db.tenantInstance.findUnique({
      where: { tenantId: id },
      include: {
        creditPackages: {
          orderBy: { purchasedAt: "desc" }
        }
      }
    })

    if (!instance) {
      return NextResponse.json({ error: "Instance not found" }, { status: 404 })
    }

    return NextResponse.json({
      balanceCredits: instance.balanceCredits,
      history: instance.creditPackages
    })

  } catch (error: any) {
    console.error("[Tenant Credits] Error:", error)
    return NextResponse.json({ error: "Failed to fetch credit history" }, { status: 500 })
  }
}
