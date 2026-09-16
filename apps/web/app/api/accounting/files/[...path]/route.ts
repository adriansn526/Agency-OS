import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getFileStream } from '@/lib/storage/s3'

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 1. Verificare autentificare
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // 2. Reconstruire key din URL
    // ex: /api/accounting/files/bank-statements/123/456.pdf -> bank-statements/123/456.pdf
    const key = params.path.join('/')
    if (!key) {
      return new NextResponse('Missing file path', { status: 400 })
    }

    // 3. Preluare stream + info din storage
    const fileData = await getFileStream(key)

    if (!fileData) {
      return new NextResponse('File not found', { status: 404 })
    }

    // 4. Returnare stream direct (fără redirect)
    return new NextResponse(fileData.body as any, {
      status: 200,
      headers: {
        'Content-Type': fileData.contentType,
        'Content-Length': fileData.contentLength.toString(),
        // Inline pentru vizualizare directă în browser
        'Content-Disposition': `inline; filename="${params.path[params.path.length - 1]}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[FileProxy]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
