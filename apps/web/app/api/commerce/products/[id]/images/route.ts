import { NextResponse } from 'next/server'
import { requireCommerceAdmin, badRequest } from '@/lib/commerce/admin-guard'
import { addManualImage, ImageUploadError, MAX_MANUAL_BYTES, removeManualImage } from '@/lib/commerce/images/upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }
const fail = (e: unknown) => {
  if (e instanceof ImageUploadError) return NextResponse.json({ error: e.message }, { status: e.status })
  console.error('[commerce/product-images]', e)
  return NextResponse.json({ error: 'Eroare internă' }, { status: 500 })
}

/** POST multipart/form-data { file } — adds a manual image (admin). */
export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  if (!id || id.length > 40) return badRequest()
  try {
    const len = Number(req.headers.get('content-length') ?? 0)
    if (len > MAX_MANUAL_BYTES + 64 * 1024) throw new ImageUploadError('Fișierul depășește 8 MB.', 413)
    const form = await req.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) throw new ImageUploadError('Lipsește fișierul.')
    return NextResponse.json(await addManualImage(id, Buffer.from(await file.arrayBuffer())), { status: 201 })
  } catch (e) { return fail(e) }
}

/** DELETE ?imageId=… — removes a MANUAL image (admin). */
export async function DELETE(req: Request, { params }: Ctx) {
  const denied = await requireCommerceAdmin()
  if (denied) return denied
  const { id } = await params
  const imageId = new URL(req.url).searchParams.get('imageId')
  if (!id || !imageId || id.length > 40 || imageId.length > 40) return badRequest()
  try { await removeManualImage(id, imageId); return NextResponse.json({ ok: true }) } catch (e) { return fail(e) }
}
