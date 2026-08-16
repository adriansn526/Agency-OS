import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const packages = await db.creditPackageConfig.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(packages)
  } catch (error: any) {
    console.error("[Credit Packages] Fetch Error:", error)
    return NextResponse.json({ error: "Failed to fetch packages" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, priceEur, totalCredits } = body

    if (!name) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 })
    }

    const pkg = await db.creditPackageConfig.create({
      data: {
        name,
        priceEur: Number(priceEur) || 0,
        totalCredits: Number(totalCredits) || 0,
      },
    })

    return NextResponse.json(pkg)
  } catch (error: any) {
    console.error("[Credit Packages] Create Error:", error)
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 })
  }
}
