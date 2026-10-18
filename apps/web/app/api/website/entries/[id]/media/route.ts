import { NextResponse } from 'next/server'
import { requireWebsiteAdmin } from '@/lib/website/admin/guard'
import { AdminError, respond } from '@/lib/website/admin/errors'
import { clearEntryImage, uploadEntryImage } from '@/lib/website/media/service'
import { LIMITS, type ImageKind } from '@/lib/website/media/process'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const lineOf = (req: Request) => new URL(req.url).searchParams.get('lineId') ?? ''
type Ctx = { params: Promise<{ id: string }> }

/** POST multipart/form-data: file, kind = logo | cover | image, alt? */
export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  return respond(async () => {
    const declared = Number(req.headers.get('content-length') ?? 0)
    if (declared > LIMITS.image.maxBytes + 100_000) throw new AdminError('Fișier prea mare', 413)
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    const kind = String(form?.get('kind') ?? '')
    if (!(file instanceof File)) throw new AdminError('Lipsește fișierul', 400)
    if (!['logo', 'cover', 'image'].includes(kind)) throw new AdminError('kind trebuie să fie logo, cover sau image', 400)
    return uploadEntryImage(lineOf(req), (await params).id, kind as ImageKind, Buffer.from(await file.arrayBuffer()), { alt: form?.get('alt') })
  }, 201)
}

/** DELETE ?kind=logo|cover removes the logo / cover (gallery images are removed by id). */
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireWebsiteAdmin(); if (denied) return denied
  const kind = new URL(req.url).searchParams.get('kind')
  if (kind !== 'logo' && kind !== 'cover') return NextResponse.json({ error: 'kind trebuie să fie logo sau cover' }, { status: 400 })
  return respond(async () => clearEntryImage(lineOf(req), (await params).id, kind))
}
