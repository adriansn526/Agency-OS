import { NextResponse } from "next/server"
import { db as prisma } from "@repo/db"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const schedules = await prisma.clientReport.findMany({
      where: {
        scheduleEnabled: true,
      },
      include: {
        client: {
          select: {
            companyName: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({ success: true, data: schedules })
  } catch (error: any) {
    console.error("Error fetching schedules:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
