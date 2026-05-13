// ─── GET/POST /api/ai/copilot/conversations ───
import { NextRequest, NextResponse } from 'next/server'
import { listConversations, createConversation } from '@/lib/ai/copilot/conversation-store'

export async function GET() {
  try {
    const conversations = await listConversations(20)
    return NextResponse.json({ data: conversations })
  } catch (error) {
    console.error('[API] GET /api/ai/copilot/conversations error:', error)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, pathname } = body

    const id = await createConversation(message || 'Conversație nouă', pathname)
    return NextResponse.json({ data: { id } }, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/ai/copilot/conversations error:', error)
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
  }
}
