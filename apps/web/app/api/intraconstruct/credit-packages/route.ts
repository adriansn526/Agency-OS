import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

export async function GET(request: NextRequest) {
  try {
    const licenseKey = request.headers.get("x-license-key")
    if (!licenseKey) {
      return NextResponse.json({ error: "Missing license key" }, { status: 401 })
    }

    // Verify the license key corresponds to a valid tenant instance
    const instance = await db.tenantInstance.findUnique({
      where: { licenseKey },
    })

    if (!instance) {
      return NextResponse.json({ error: "Invalid license key" }, { status: 403 })
    }

    // Fetch active credit packages
    const packages = await db.creditPackageConfig.findMany({
      where: { isActive: true },
      orderBy: { priceEur: "asc" },
    })

    return NextResponse.json({ packages })
  } catch (error: any) {
    console.error("[Agency-OS Credit Packages API] Error:", error.message)
    return NextResponse.json({ error: "Failed to fetch credit packages" }, { status: 500 })
  }
}
