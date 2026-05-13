import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── GET /api/contracts/public/[id] ─── Public (no auth)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contract = await db.contract.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true } },
        businessLine: { select: { name: true, slug: true } },
        offer: { select: { number: true } },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Return only what's needed for public view (no sensitive data)
    return NextResponse.json({
      data: {
        id: contract.id,
        number: contract.number,
        status: contract.status,
        value: contract.value,
        currency: contract.currency,
        duration: contract.duration,
        startDate: contract.startDate,
        endDate: contract.endDate,
        signedAt: contract.signedAt,
        sections: contract.sections,
        anexa2: contract.anexa2,
        companyDetails: contract.companyDetails,
        clientDetails: contract.clientDetails,
        businessLine: contract.businessLine,
        client: contract.client,
        offer: contract.offer,
      },
    })
  } catch (error) {
    console.error('[API] GET /api/contracts/public/[id] error:', error)
    return NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 })
  }
}
