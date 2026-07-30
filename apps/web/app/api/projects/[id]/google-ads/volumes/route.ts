import { NextResponse } from 'next/server';
import { getKeywordVolumes } from '@/lib/integrations/google-ads';
import { db } from '@repo/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { keywords } = await req.json();
    const resolvedParams = await params;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'Missing keywords array' }, { status: 400 });
    }

    // 1. Get the project and its client to see if they have a specific Google Ads ID
    const project = await db.project.findUnique({
      where: { id: resolvedParams.id },
      include: { client: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Use client's Google Ads ID or fallback to MCC if available. 
    const customerId = project.client?.googleAdsCustomerId || process.env.GOOGLE_ADS_MANAGER_ID;

    if (!customerId) {
      return NextResponse.json({ 
        error: 'Nu există un cont Google Ads conectat pentru acest client sau în platformă.' 
      }, { status: 400 });
    }

    // We chunk the keywords to max 200 per request.
    const topKeywords = keywords.slice(0, 200);

    const volumes = await getKeywordVolumes(customerId, topKeywords);

    return NextResponse.json({
      success: true,
      data: volumes // { "keyword1": 500, "keyword2": 1000 }
    });
  } catch (error: any) {
    console.error('Error fetching Google Ads volumes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
