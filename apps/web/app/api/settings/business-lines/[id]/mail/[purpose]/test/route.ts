import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isMailPurpose, testMailSettings } from '@/lib/mail/business-line-mail'

export const dynamic = 'force-dynamic'

// POST → verifies the SAVED SMTP login of the mailbox; sends a test message when { sendTo } is given
export async function POST(req: Request, { params }: { params: Promise<{ id: string; purpose: string }> }) {
  const { id, purpose } = await params
  if (!isMailPurpose(purpose)) return NextResponse.json({ error: 'Scop necunoscut' }, { status: 400 })
  const body = z.object({ sendTo: z.string().trim().email().optional().or(z.literal('')) }).safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ error: 'Adresă invalidă' }, { status: 400 })
  const r = await testMailSettings(id, purpose, body.data.sendTo || undefined)
  return NextResponse.json(r, { status: r.ok ? 200 : 422 })
}
