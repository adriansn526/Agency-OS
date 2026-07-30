import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';
import { runPosthogQuery } from '@/lib/integrations/posthog';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { clientId: true, metadata: true }
    });

    if (!project || !project.clientId) {
      return NextResponse.json({ error: 'Client not found for this project' }, { status: 404 });
    }
    
    const meta = project.metadata as any || {};
    const customProjectId = meta.posthogProjectId;

    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');
    
    let timeFilter = "timestamp >= now() - INTERVAL 30 DAY";
    if (from) {
      timeFilter = `timestamp >= '${from} 00:00:00'`;
      if (to) {
        timeFilter += ` AND timestamp <= '${to} 23:59:59'`;
      }
    }

    const hogQlQuery = `
      SELECT 
        properties.$pathname as path,
        countIf(event = '$pageview') as pageviews,
        count(distinct if(event = '$pageview', distinct_id, null)) as unique_visitors,
        avg(if(event = '$pageview' AND properties.$device_type = 'Mobile', 100, null)) as mobile_pct,
        countIf(event = '$autocapture' AND (properties.$elements_chain LIKE '%tel:%' OR properties.$elements_chain LIKE '%wa.me%')) as clicks_contact,
        countIf(event = '$autocapture' AND properties.$elements_chain LIKE '%form%') as forms_submitted,
        avgIf(toFloat(properties.percentage), event = 'scroll_depth') as avg_scroll
      FROM events
      WHERE ${timeFilter} AND event IN ('$pageview', '$autocapture', 'scroll_depth')
      GROUP BY path
      ORDER BY pageviews DESC
      LIMIT 1000
    `;

    const result = await runPosthogQuery(project.clientId, hogQlQuery, customProjectId);

    if (!result.results) {
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    const pages: Record<string, { pageviews: number; unique_visitors: number; mobile_pct: number; clicks_contact: number; forms_submitted: number; avg_scroll: number }> = {};
    for (const row of result.results) {
      const [path, pageviews, unique_visitors, mobile_pct, clicks_contact, forms_submitted, avg_scroll] = row;
      if (typeof path === 'string') {
        const cleanPath = path.replace(/\/$/, '') || '/';
        pages[cleanPath] = {
          pageviews: Number(pageviews) || 0,
          unique_visitors: Number(unique_visitors) || 0,
          mobile_pct: Number(mobile_pct) || 0,
          clicks_contact: Number(clicks_contact) || 0,
          forms_submitted: Number(forms_submitted) || 0,
          avg_scroll: Number(avg_scroll) || 0,
        };
      }
    }

    const preview: any = {};
    Object.keys(pages).slice(0, 5).forEach(k => preview[k] = pages[k]);
    console.log("[PostHog API] returning pages:", preview);
    return NextResponse.json({ data: pages });
  } catch (error: any) {
    console.error('[PostHog Pages API] error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
