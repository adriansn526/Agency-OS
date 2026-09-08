import { NextResponse } from "next/server"
import { db } from "@repo/db"

export async function GET() {
  try {
    const alerts = await db.systemAlert.findMany({
      where: { status: "new" },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    return NextResponse.json({ success: true, alerts })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return NextResponse.json({ success: false, error: "Eroare la preluarea alertelor" }, { status: 500 })
  }
}
