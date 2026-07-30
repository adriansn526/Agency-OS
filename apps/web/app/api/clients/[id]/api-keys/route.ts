/**
 * Client API Keys Management
 * 
 * GET /api/clients/[id]/api-keys      List keys for a client
 * POST /api/clients/[id]/api-keys     Create new key
 * DELETE /api/clients/[id]/api-keys    Delete key (body: { keyId })
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const keys = await db.clientApiKey.findMany({
      where: { clientId: id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: keys })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const domain = (body.domain || '').trim()
    const label = (body.label || '').trim()

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Clean domain (remove protocol and trailing slash)
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    const key = await db.clientApiKey.create({
      data: {
        clientId: id,
        key: randomUUID(),
        domain: cleanDomain,
        label: label || `Formular ${cleanDomain}`,
      },
    })

    return NextResponse.json({ data: key }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const keyId = body.keyId

    if (!keyId) {
      return NextResponse.json({ error: 'keyId is required' }, { status: 400 })
    }

    await db.clientApiKey.delete({
      where: { id: keyId, clientId: id },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
