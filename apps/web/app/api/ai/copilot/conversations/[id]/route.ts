// ─── GET/DELETE /api/ai/copilot/conversations/[id] ───
import { NextRequest, NextResponse } from 'next/server'
import { loadConversation, deleteConversation } from '@/lib/ai/copilot/conversation-store'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const conversation = await loadConversation(id)

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return NextResponse.json({ data: conversation })
  } catch (error) {
    console.error('[API] GET /api/ai/copilot/conversations/[id] error:', error)
    return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteConversation(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/ai/copilot/conversations/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
  }
}
