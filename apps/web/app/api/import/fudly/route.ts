import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { db } from '@repo/db'

const FUDLY_MONGO_URI = process.env.FUDLY_MONGODB_URI || 'mongodb://localhost:27017/fudly'
const EXTERNAL_SOURCE = 'fudly_crm'

// ─── Helpers ───

function parseReviews(val: string | undefined): number {
  if (!val) return 0
  const cleaned = val.replace(/[+,]/g, '').trim().toLowerCase()
  if (cleaned.endsWith('k')) return Math.round(parseFloat(cleaned) * 1000)
  return parseInt(cleaned, 10) || 0
}

function calculateInterestScore(lead: any): number {
  let score = 0

  // Rating (max 30)
  const rating = lead.boltRating || 0
  if (rating >= 4.5) score += 30
  else if (rating >= 4.0) score += 22
  else if (rating >= 3.5) score += 15
  else score += 5

  // Popularity (max 25)
  const reviews = parseReviews(lead.boltReviewsCount)
  if (reviews > 500) score += 25
  else if (reviews > 100) score += 18
  else if (reviews > 20) score += 10
  else score += 3

  // Digital presence (max 20) — inverted: no site = higher need
  const hasWebsite = !!lead.website
  const hasSocial = !!lead.social
  if (!hasWebsite && !hasSocial) score += 20
  else if (!hasWebsite) score += 12
  else score += 5

  // Platform dependency (max 15)
  const platforms = lead.deliveryLinks?.length || 1
  if (platforms === 1) score += 15
  else if (platforms === 2) score += 10
  else score += 5

  // Data completeness (max 10)
  const hasPhone = !!(lead.phone || lead.contact?.phone)
  const hasEmail = !!(lead.email || lead.contact?.email)
  const hasCUI = !!lead.companyDetails?.cui
  if (hasPhone && hasEmail && hasCUI) score += 10
  else if (hasPhone || hasEmail) score += 6
  else score += 2

  return score
}

function getSegment(score: number): string {
  if (score >= 75) return 'hot'
  if (score >= 50) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

function getQualityTier(rating: number): string {
  if (rating >= 4.5) return 'premium'
  if (rating >= 4.0) return 'good'
  if (rating >= 3.5) return 'average'
  return 'low'
}

function getPopularityTier(reviews: number): string {
  if (reviews > 500) return 'hot'
  if (reviews > 100) return 'growing'
  if (reviews > 20) return 'small'
  return 'new'
}

function mapStatus(fudlyStatus: string): string {
  switch (fudlyStatus) {
    case 'NEW': return 'nou'             // Necontactat — prospecting
    case 'CONTACTED': return 'trial'     // Contactat — trial stage
    case 'IN_PROGRESS': return 'onboarding' // În lucru — onboarding stage
    default: return 'nou'
  }
}

function mapDataQuality(status: string): string {
  switch (status) {
    case 'SUCCESS': return 'complet'
    case 'PARTIAL': return 'parțial'
    default: return 'neverificat'
  }
}

// ─── POST /api/import/fudly — Run import ───

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let mongoClient: MongoClient | null = null

  try {
    const body = await request.json().catch(() => ({}))
    const dryRun = body.dryRun === true
    const limit = body.limit || 0 // 0 = all

    // 1. Get Fudly business line
    const fudlyBL = await db.businessLine.findUnique({ where: { slug: 'fudly' } })
    if (!fudlyBL) {
      return NextResponse.json({ error: 'Fudly business line not found' }, { status: 404 })
    }

    // 2. Connect to Fudly MongoDB
    mongoClient = new MongoClient(FUDLY_MONGO_URI)
    await mongoClient.connect()
    const fudlyDb = mongoClient.db()

    // 3. Fetch importable leads
    const filter = {
      status: { $in: ['NEW', 'CONTACTED', 'IN_PROGRESS'] },
      $or: [
        { url: { $regex: /bolt\.eu|food\.bolt/ } },
        { 'deliveryLinks.platform': 'bolt' },
      ],
    }

    let cursor = fudlyDb.collection('leads').find(filter)
    if (limit > 0) cursor = cursor.limit(limit)
    const fudlyLeads = await cursor.toArray()

    // 4. Get existing external IDs to avoid duplicates
    const existingLeads = await db.lead.findMany({
      where: { externalSource: EXTERNAL_SOURCE },
      select: { externalId: true },
    })
    const existingIds = new Set(existingLeads.map(l => l.externalId))

    // 5. Map and profile
    const stats = { total: fudlyLeads.length, imported: 0, skipped: 0, errors: 0, segments: { hot: 0, high: 0, medium: 0, low: 0 } as Record<string, number> }
    const mapped: any[] = []

    for (const fl of fudlyLeads) {
      const externalId = fl._id.toString()

      // Skip duplicates
      if (existingIds.has(externalId)) {
        stats.skipped++
        continue
      }

      // Merge contact fields
      const phone = fl.contact?.phone || fl.phone || null
      const email = fl.contact?.email || fl.email || null
      const contactPerson = fl.contact?.personName || fl.contactPerson || ''

      // Skip if no way to contact
      if (!email && !phone) {
        stats.skipped++
        continue
      }

      // Calculate profile
      const reviews = parseReviews(fl.boltReviewsCount)
      const interestScore = calculateInterestScore(fl)
      const segment = getSegment(interestScore)

      const platforms = fl.deliveryLinks?.map((dl: any) => dl.platform) || ['bolt']

      const leadData = {
        businessLineId: fudlyBL.id,
        entityType: 'restaurants',
        companyName: fl.companyDetails?.companyName || fl.name || 'N/A',
        contactPerson: contactPerson || fl.name || 'N/A',
        email: email || `no-email-${externalId}@placeholder.local`,
        phone,
        status: mapStatus(fl.status),
        source: 'boltfood_scrape',
        value: 59, // Default Pro plan monthly
        probability: interestScore,
        priority: segment === 'hot' ? 'urgent' : segment === 'high' ? 'high' : segment === 'medium' ? 'medium' : 'low',
        notes: fl.notes || null,
        externalId,
        externalSource: EXTERNAL_SOURCE,
        city: fl.city || null,
        address: fl.address || null,
        customFields: {
          // Bolt data
          bolt_rating: fl.boltRating || null,
          bolt_reviews: reviews,
          bolt_reviews_raw: fl.boltReviewsCount || null,
          bolt_sponsored: fl.isSponsored || false,
          bolt_url: fl.url || null,
          delivery_tags: fl.deliveryTags || [],
          delivery_platforms: platforms,
          // Company details
          cui: fl.companyDetails?.cui || null,
          reg_com: fl.companyDetails?.regCom || null,
          sediu_social: fl.companyDetails?.companyAddress || null,
          // Digital presence
          website: fl.website || null,
          social: fl.social || null,
          // Profile
          quality_tier: getQualityTier(fl.boltRating || 0),
          popularity_tier: getPopularityTier(reviews),
          digital_presence: (!fl.website && !fl.social) ? 'none' : (!fl.website ? 'basic' : 'strong'),
          platform_dependency: platforms.length === 1 ? 'bolt_only' : platforms.length >= 2 ? 'multi' : 'unknown',
          data_quality: mapDataQuality(fl.enrichmentStatus),
          interest_score: interestScore,
          segment,
          // Metadata
          imported_at: new Date().toISOString(),
          original_created_at: fl.createdAt?.toISOString?.() || null,
          fudly_status: fl.status,
        },
      }

      mapped.push(leadData)
      stats.segments[segment] = (stats.segments[segment] || 0) + 1
    }

    // 6. Bulk create (if not dry run)
    if (!dryRun && mapped.length > 0) {
      // Batch create in chunks of 50 to avoid timeout
      const chunkSize = 50
      for (let i = 0; i < mapped.length; i += chunkSize) {
        const chunk = mapped.slice(i, i + chunkSize)
        await db.lead.createMany({ data: chunk, skipDuplicates: true })
      }
      stats.imported = mapped.length
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      dryRun,
      stats: {
        ...stats,
        imported: dryRun ? 0 : mapped.length,
        wouldImport: dryRun ? mapped.length : undefined,
        duration: `${(duration / 1000).toFixed(1)}s`,
      },
      sample: mapped.slice(0, 3).map(l => ({
        name: l.companyName,
        city: l.city,
        score: l.customFields.interest_score,
        segment: l.customFields.segment,
        rating: l.customFields.bolt_rating,
        reviews: l.customFields.bolt_reviews,
      })),
    })
  } catch (error: any) {
    console.error('Import Fudly error:', error)
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 })
  } finally {
    if (mongoClient) await mongoClient.close()
  }
}

// ─── GET /api/import/fudly — Check import status ───

export async function GET() {
  try {
    const fudlyBL = await db.businessLine.findUnique({ where: { slug: 'fudly' } })
    if (!fudlyBL) {
      return NextResponse.json({ imported: 0, message: 'Fudly BL not found' })
    }

    const [total, bySegment] = await Promise.all([
      db.lead.count({ where: { externalSource: EXTERNAL_SOURCE } }),
      db.lead.groupBy({
        by: ['priority'],
        where: { externalSource: EXTERNAL_SOURCE },
        _count: true,
      }),
    ])

    return NextResponse.json({
      imported: total,
      segments: Object.fromEntries(bySegment.map(s => [s.priority, s._count])),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
