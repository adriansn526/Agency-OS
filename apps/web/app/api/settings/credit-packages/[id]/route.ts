import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.creditPackageConfig.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Credit Packages] Delete Error:", error)
    return NextResponse.json({ error: "Failed to delete package" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, priceEur, totalCredits } = body

    if (!name) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 })
    }

    const pkg = await db.creditPackageConfig.update({
      where: { id },
      data: {
        name,
        priceEur: Number(priceEur) || 0,
        totalCredits: Number(totalCredits) || 0,
      },
    })

    return NextResponse.json(pkg)
  } catch (error: any) {
    console.error("[Credit Packages] Update Error:", error)
    return NextResponse.json({ error: "Failed to update package" }, { status: 500 })
  }
}
