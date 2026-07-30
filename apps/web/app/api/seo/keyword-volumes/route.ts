import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { getKeywordVolumes } from '@/lib/integrations/google-ads'

export async function POST(req: NextRequest) {
  try {
    const { projectId, keywords } = await req.json()

    if (!projectId || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: 'Missing projectId or keywords' }, { status: 400 })
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          select: {
            googleAdsCustomerId: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const meta = project.metadata as any
    const googleAdsId = meta?.adsCustomerId || project.client.googleAdsCustomerId

    if (!googleAdsId) {
      return NextResponse.json({ error: 'No Google Ads Customer ID linked' }, { status: 400 })
    }

    const volumes = await getKeywordVolumes(googleAdsId as string, keywords)

    return NextResponse.json({ data: volumes })
  } catch (error: any) {
    console.error('[API] POST /api/seo/keyword-volumes error:', error)
    return NextResponse.json({ error: 'Failed to fetch volumes', details: error.message }, { status: 500 })
  }
}
