import { NextResponse } from "next/server"
import { db } from "@repo/db"

export async function GET() {
  try {
    const rules = await db.creditPricingRule.findMany({
      orderBy: { serviceName: "asc" }
    })
    return NextResponse.json(rules)
  } catch (error) {
    console.error("[GET_PRICING_RULES]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Body is an array of rules to update
    for (const rule of body) {
      await db.creditPricingRule.update({
        where: { id: rule.id },
        data: {
          costPerUnitEur: Number(rule.costPerUnitEur),
          creditsPerUnit: Number(rule.creditsPerUnit),
        }
      })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[UPDATE_PRICING_RULES]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
