import { NextResponse } from 'next/server'
import { db } from '@repo/db'
import { isMailPurpose, invalidateLineMail, mailSettingsSchema, saveMailSettings } from '@/lib/mail/business-line-mail'

export const dynamic = 'force-dynamic'
type Ctx = { params: Promise<{ id: string; purpose: string }> }

// PUT /api/settings/business-lines/[id]/mail/[purpose] → upsert one mailbox; smtpPass is only replaced when sent
export async function PUT(req: Request, { params }: Ctx) {
  const { id, purpose } = await params
  if (!isMailPurpose(purpose)) return NextResponse.json({ error: 'Scop necunoscut' }, { status: 400 })
  const line = await db.businessLine.findUnique({ where: { id }, select: { id: true } })
  if (!line) return NextResponse.json({ error: 'Linia nu există' }, { status: 404 })
  const parsed = mailSettingsSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Date invalide', details: parsed.error.issues }, { status: 400 })
  try {
    return NextResponse.json({ data: await saveMailSettings(id, purpose, parsed.data) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Salvarea a eșuat' }, { status: 400 })
  }
}

// DELETE → remove the mailbox (the line falls back to its general mailbox / default sender)
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, purpose } = await params
  if (!isMailPurpose(purpose)) return NextResponse.json({ error: 'Scop necunoscut' }, { status: 400 })
  await db.businessLineMailbox.deleteMany({ where: { businessLineId: id, purpose } })
  invalidateLineMail()
  return NextResponse.json({ ok: true })
}
