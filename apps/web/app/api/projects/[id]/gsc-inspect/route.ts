import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/db';
import { inspectUrl } from '@/lib/integrations/gsc';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { id },
      include: { client: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const meta = project.metadata as any;
    const gscSiteUrl = meta?.gscSiteUrl || project.client.gscSiteUrl;

    if (!gscSiteUrl) {
      return NextResponse.json({ error: 'GSC Site URL not configured for this project' }, { status: 400 });
    }

    const result = await inspectUrl(gscSiteUrl, url);
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[API] GSC Inspect Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
