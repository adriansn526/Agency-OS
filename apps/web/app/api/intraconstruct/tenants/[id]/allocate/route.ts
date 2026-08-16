import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params // This is the tenantInstance.id
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
      where: { tenantId: id },
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

    // 4. Push sync to remote tenant instance if api endpoint exists
    if (updatedInstance.apiEndpoint && updatedInstance.internalApiKey) {
      try {
        await fetch(`${updatedInstance.apiEndpoint}/api/internal/license/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${updatedInstance.internalApiKey}`
          },
          body: JSON.stringify({
            balanceCredits: updatedInstance.balanceCredits,
            packageId: pkg.id
          })
        }).catch(err => console.error("[Tenant Allocate] Push sync network error:", err))
      } catch (err) {
        console.error("[Tenant Allocate] Push sync failed:", err)
      }
    }

    return NextResponse.json(updatedInstance)

  } catch (error: any) {
    console.error("[Tenant Allocate] Error:", error)
    return NextResponse.json({ error: "Failed to allocate package" }, { status: 500 })
  }
}
