import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const businessLineId = searchParams.get('businessLineId')

    if (!businessLineId) {
      return NextResponse.json({ error: 'Missing businessLineId' }, { status: 400 })
    }

    // Query to get distinct keys from the JSON object customFields.rawFormData
    const result = await db.$queryRaw<{ key: string }[]>`
      SELECT DISTINCT jsonb_object_keys("customFields"->'rawFormData') as key
      FROM "Lead"
      WHERE "businessLineId" = ${businessLineId}
        AND "customFields"->'rawFormData' IS NOT NULL;
    `

    const keys = result.map(r => r.key).filter(k => k !== 'undefined' && k !== 'null')

    return NextResponse.json({ keys })
  } catch (error) {
    console.error('Error fetching custom fields:', error)
    return NextResponse.json({ error: 'Failed to fetch custom fields' }, { status: 500 })
  }
}
