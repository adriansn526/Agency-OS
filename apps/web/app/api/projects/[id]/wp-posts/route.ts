import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { getWPPosts, saveWPPost } from '@/lib/integrations/wordpress'

// GET: Fetch drafts/posts from WordPress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const project = await db.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const metadata = (project.metadata as any) || {}
    const { wpUrl, wpUsername, wpAppPassword } = metadata

    if (!wpUrl) {
      return NextResponse.json({ error: 'WordPress configuration missing (URL)' }, { status: 400 })
    }

    const { data, error } = await getWPPosts(wpUrl, wpUsername, wpAppPassword, 'draft,publish', 50)
    
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // Merge with local cache (since WP REST API often ignores meta fields without custom plugins)
    const wpSeoCache = metadata.wpSeoCache || {}
    const enrichedData = data.map((post: any) => {
      const cache = wpSeoCache[post.id]
      if (cache) {
        return {
          ...post,
          yoast_head_json: {
            ...post.yoast_head_json,
            focus_kw: cache.yoast_wpseo_focuskw || cache.rank_math_focus_keyword || post.yoast_head_json?.focus_kw,
            title: cache.yoast_wpseo_title || cache.rank_math_title || post.yoast_head_json?.title,
            description: cache.yoast_wpseo_metadesc || cache.rank_math_description || post.yoast_head_json?.description,
          },
          rank_math_focus_keyword: cache.rank_math_focus_keyword || post.rank_math_focus_keyword,
          agencyos_benchmark: cache.agencyos_benchmark,
          agencyos_lsi: cache.agencyos_lsi,
          agencyos_revisions: metadata.wpSeoRevisions?.[post.id] || []
        }
      }
      return {
        ...post,
        agencyos_revisions: metadata.wpSeoRevisions?.[post.id] || []
      }
    })

    return NextResponse.json({ data: enrichedData })
  } catch (error: any) {
    console.error('[API] GET /api/projects/[id]/wp-posts error:', error)
    return NextResponse.json({ error: 'Failed to fetch WordPress posts', details: error.message }, { status: 500 })
  }
}

// POST: Save draft/post to WordPress
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { postId, title, content, status, meta } = body

    if (!title && !content && !meta) {
      return NextResponse.json({ error: 'Title, content or meta are required' }, { status: 400 })
    }

    const project = await db.project.findUnique({ where: { id } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const metadata = (project.metadata as any) || {}
    const { wpUrl, wpUsername, wpAppPassword } = metadata

    if (!wpUrl || !wpUsername || !wpAppPassword) {
      return NextResponse.json({ error: 'WordPress credentials missing in project settings' }, { status: 400 })
    }

    const { data, error } = await saveWPPost(wpUrl, wpUsername, wpAppPassword, {
      id: postId,
      title,
      content,
      status,
      meta
    })

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    // NEW: Save meta and revisions to local DB as fallback
    if (meta && project && data?.id) {
      const actualPostId = data.id.toString()
      const wpSeoCache = metadata.wpSeoCache || {}
      wpSeoCache[actualPostId] = {
        ...(wpSeoCache[actualPostId] || {}),
        ...meta
      }
      
      const wpSeoRevisions = metadata.wpSeoRevisions || {}
      if (!wpSeoRevisions[actualPostId]) {
        wpSeoRevisions[actualPostId] = []
      }
      
      wpSeoRevisions[actualPostId].unshift({
        timestamp: new Date().toISOString(),
        title: title || meta.yoast_wpseo_title || meta.rank_math_title || '',
        metaDesc: meta.yoast_wpseo_metadesc || meta.rank_math_description || '',
        content: content || ''
      })
      
      // Keep only last 15 revisions
      if (wpSeoRevisions[actualPostId].length > 15) {
        wpSeoRevisions[actualPostId] = wpSeoRevisions[actualPostId].slice(0, 15)
      }

      await db.project.update({
        where: { id },
        data: {
          metadata: {
            ...metadata,
            wpSeoCache,
            wpSeoRevisions
          }
        }
      })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('[API] POST /api/projects/[id]/wp-posts error:', error)
    return NextResponse.json({ error: 'Failed to save WordPress post', details: error.message }, { status: 500 })
  }
}
