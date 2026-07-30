import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@repo/db'

// GET /api/cron/content-scan
// Scans all feed sources with active cron schedules and discovers new articles
export async function GET(req: NextRequest) {
  // Optional: verify cron secret for security
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find all SEO projects
    const projects = await prisma.project.findMany({
      where: { templateId: { in: ['seo_project', 'seo_programmatic'] } },
      select: { id: true, name: true, metadata: true }
    })

    let totalScanned = 0
    let totalNewArticles = 0

    for (const project of projects) {
      const meta = project.metadata as any || {}
      const sources = meta.contentSources || []
      let updated = false

      for (const source of sources) {
        // Only process feed sources with an active cron schedule
        if (source.sourceType !== 'feed' || source.cronSchedule === 'manual' || !source.cronSchedule) continue

        // Check if it's time to scan based on schedule
        const lastScan = source.lastCronScan ? new Date(source.lastCronScan) : null
        const now = new Date()
        
        if (lastScan) {
          const hoursSinceLastScan = (now.getTime() - lastScan.getTime()) / (1000 * 60 * 60)
          const scheduleHours: Record<string, number> = {
            'daily': 24,
            'weekly': 168,
            'monthly': 720
          }
          const requiredHours = scheduleHours[source.cronSchedule] || 168
          if (hoursSinceLastScan < requiredHours) continue // Not time yet
        }

        // Discover new articles
        try {
          const discoverRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scrape/discover`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: source.url, maxArticles: source.maxArticles || 10 })
          })

          if (!discoverRes.ok) continue

          const { articles } = await discoverRes.json()
          const existingUrls = new Set((source.articles || []).map((a: any) => a.url))
          const newArticles = articles.filter((a: any) => !existingUrls.has(a.url))

          if (newArticles.length > 0) {
            source.articles = [
              ...(source.articles || []),
              ...newArticles.map((a: any) => ({
                id: crypto.randomUUID(),
                title: a.title,
                url: a.url,
                status: 'pending'
              }))
            ]
            totalNewArticles += newArticles.length
            updated = true
          }

          source.lastCronScan = now.toISOString()
          totalScanned++
        } catch (e) {
          console.error(`Error scanning feed ${source.name}:`, e)
        }
      }

      if (updated) {
        meta.contentSources = sources
        await prisma.project.update({
          where: { id: project.id },
          data: { metadata: meta }
        })
      }
    }

    return NextResponse.json({
      success: true,
      scanned: totalScanned,
      newArticles: totalNewArticles,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Content scan cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
