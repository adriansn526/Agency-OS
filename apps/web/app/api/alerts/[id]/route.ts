import { NextResponse } from "next/server"
import { db } from "@repo/db"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const { status } = await request.json()
    const resolvedParams = await params
    const id = resolvedParams.id
    
    const alert = await db.systemAlert.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === "resolved" ? new Date() : null,
      },
    })
    
    return NextResponse.json({ success: true, alert })
  } catch (error) {
    console.error("Error updating alert:", error)
    return NextResponse.json({ success: false, error: "Eroare la actualizarea alertei" }, { status: 500 })
  }
}
