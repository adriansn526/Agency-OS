import { NextResponse } from 'next/server'
import { db } from '@repo/db'

// Temporary migration endpoint — fix Fudly lead statuses
export async function POST() {
  try {
    // All imported Fudly leads that are currently 'trial' should be 'nou' 
    // (they were NEW/uncontacted, not yet in trial)
    const r1 = await db.lead.updateMany({
      where: { 
        externalSource: 'fudly_crm',
        status: { in: ['contactat', 'calificat', 'trial'] }
      },
      data: { status: 'nou' }
    })

    // negociere -> onboarding
    const r2 = await db.lead.updateMany({
      where: { externalSource: 'fudly_crm', status: 'negociere' },
      data: { status: 'onboarding' }
    })

    return NextResponse.json({
      success: true,
      updated: { nou: r1.count, onboarding: r2.count }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
