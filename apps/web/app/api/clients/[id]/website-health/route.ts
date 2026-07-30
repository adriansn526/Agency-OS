import { NextRequest, NextResponse } from 'next/server'
import { runPosthogQuery } from '@/lib/integrations/posthog'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clientId = params.id
    
    // 1. JS Exceptions Query
    // We group by error message and get the count and an example session ID
    const exceptionsQuery = `
      SELECT 
        properties.$exception_message as message,
        count() as count,
        any(properties.$session_id) as example_session
      FROM events 
      WHERE event = '$exception' 
      AND timestamp >= now() - INTERVAL 7 DAY
      GROUP BY message
      ORDER BY count DESC
      LIMIT 10
    `

    // 2. Rage Clicks Query
    // PostHog automatically tracks $rageclick events
    const rageClicksQuery = `
      SELECT 
        properties.$current_url as url,
        count() as count,
        any(properties.$session_id) as example_session
      FROM events 
      WHERE event = '$rageclick' 
      AND timestamp >= now() - INTERVAL 7 DAY
      GROUP BY url
      ORDER BY count DESC
      LIMIT 10
    `

    const [exceptionsRes, rageClicksRes] = await Promise.all([
      runPosthogQuery(clientId, exceptionsQuery).catch(err => {
        console.error("Exceptions query error:", err)
        return { results: [] }
      }),
      runPosthogQuery(clientId, rageClicksQuery).catch(err => {
        console.error("Rageclicks query error:", err)
        return { results: [] }
      })
    ])

    return NextResponse.json({
      data: {
        exceptions: exceptionsRes.results.map((row: any) => ({
          message: row[0],
          count: row[1],
          sessionId: row[2]
        })),
        rageClicks: rageClicksRes.results.map((row: any) => ({
          url: row[0],
          count: row[1],
          sessionId: row[2]
        }))
      }
    })

  } catch (error) {
    console.error('[API] GET /api/clients/[id]/website-health error:', error)
    return NextResponse.json({ error: 'Failed to fetch website health' }, { status: 500 })
  }
}
