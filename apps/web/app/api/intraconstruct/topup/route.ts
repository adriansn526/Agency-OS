import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

export async function POST(req: NextRequest) {
  try {
    const licenseKey = req.headers.get("x-license-key")
    if (!licenseKey) {
      return NextResponse.json({ error: "Missing license key" }, { status: 401 })
    }

    const instance = await db.tenantInstance.findUnique({
      where: { licenseKey },
    })

    if (!instance) {
      return NextResponse.json({ error: "Invalid license key" }, { status: 403 })
    }

    const body = await req.json()
    const { packageId } = body

    if (!packageId) {
      return NextResponse.json({ error: "packageId is required" }, { status: 400 })
    }

    // 1. Fetch package config
    const pkg = await db.creditPackageConfig.findUnique({
      where: { id: packageId }
    })

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 })
    }

    // 2. Update tenant instance by incrementing balances
    const updatedInstance = await db.tenantInstance.update({
      where: { id: instance.id },
      data: {
        balanceCredits: { increment: pkg.totalCredits },
      }
    })

    // 3. Log the purchase in CreditPackage (the history table)
    await db.creditPackage.create({
      data: {
        instanceId: updatedInstance.id,
        type: "universal",
        packageName: pkg.name,
        credits: pkg.totalCredits,
        priceEur: pkg.priceEur,
        costEur: 0,
        status: "active"
      }
    })

    return NextResponse.json({ success: true, balanceCredits: updatedInstance.balanceCredits })

  } catch (error: any) {
    console.error("[Agency-OS Tenant Topup] Error:", error.message)
    return NextResponse.json({ error: "Failed to allocate package" }, { status: 500 })
  }
}
