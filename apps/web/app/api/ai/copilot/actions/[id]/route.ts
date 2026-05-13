// ─── PATCH /api/ai/copilot/actions/[id] ───
// Approve or reject a copilot action
import { NextRequest, NextResponse } from 'next/server'
import { approveAction, rejectAction } from '@/lib/ai/copilot/action-system'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (status === 'approved') {
      const result = await approveAction(id)
      return NextResponse.json({ data: result })
    }

    if (status === 'rejected') {
      await rejectAction(id)
      return NextResponse.json({ data: { success: true, message: 'Acțiunea a fost anulată.' } })
    }

    return NextResponse.json({ error: 'Invalid status. Use "approved" or "rejected".' }, { status: 400 })
  } catch (error) {
    console.error('[API] PATCH /api/ai/copilot/actions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}
