import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@repo/db"

// Generate a random 6-char alphanumeric code
function generateCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  let code = ""
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// GET — list short links (with optional businessLineId filter)
export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const businessLineId = url.searchParams.get("businessLineId")
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = parseInt(url.searchParams.get("limit") || "50")

  const where = businessLineId ? { businessLineId } : {}

  const [links, total] = await Promise.all([
    db.shortLink.findMany({
      where,
      include: {
        businessLine: { select: { slug: true, name: true, domain: true } },
        campaign: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.shortLink.count({ where }),
  ])

  return NextResponse.json({
    data: links,
    pagination: { total, page, totalPages: Math.ceil(total / limit) },
  })
}

// POST — create a new short link
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { targetUrl, title, businessLineId, campaignId } = body

  if (!targetUrl || !businessLineId) {
    return NextResponse.json(
      { error: "targetUrl and businessLineId are required" },
      { status: 400 }
    )
  }

  // Generate unique code (retry on collision)
  let code: string
  let attempts = 0
  do {
    code = generateCode()
    const existing = await db.shortLink.findUnique({ where: { code } })
    if (!existing) break
    attempts++
  } while (attempts < 10)

  // Get BL domain for the full short URL
  const bl = await db.businessLine.findUnique({
    where: { id: businessLineId },
    select: { domain: true, slug: true },
  })

  const link = await db.shortLink.create({
    data: {
      code,
      targetUrl,
      title: title || null,
      businessLineId,
      campaignId: campaignId || null,
    },
    include: {
      businessLine: { select: { slug: true, name: true, domain: true } },
    },
  })

  // Build the short URL using BL domain
  const domain = bl?.domain || "admin.asns.ro"
  const shortUrl = `https://${domain}/s/${code}`

  return NextResponse.json({ data: { ...link, shortUrl } }, { status: 201 })
}
