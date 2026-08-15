import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    await db.creditPackageConfig.delete({
      where: { id },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Credit Packages] Delete Error:", error)
    return NextResponse.json({ error: "Failed to delete package" }, { status: 500 })
  }
}
