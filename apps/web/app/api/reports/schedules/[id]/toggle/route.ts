import { NextResponse } from "next/server"
import { db as prisma } from "@repo/db"

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params
    const { scheduleEnabled } = await req.json()
    
    if (typeof scheduleEnabled !== 'boolean') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
    }

    const updated = await prisma.clientReport.update({
      where: { id: params.id },
      data: { scheduleEnabled }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error: any) {
    console.error("Error toggling schedule:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
