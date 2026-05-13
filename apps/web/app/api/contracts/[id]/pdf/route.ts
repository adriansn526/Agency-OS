import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'

// ─── POST /api/contracts/[id]/pdf ───
// Generare PDF server-side
// În producție: se va integra cu Puppeteer sau @react-pdf/renderer
// Momentan returnează datele necesare pentru generarea client-side
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const contract = await db.contract.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true } },
        businessLine: { select: { id: true, slug: true, name: true } },
        offer: { select: { id: true, number: true } },
      },
    })

    if (!contract) {
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      )
    }

    // Try Puppeteer-based PDF generation
    try {
      // @ts-ignore — puppeteer is an optional dependency, falls back to client-side PDF
      const puppeteer = await import('puppeteer')
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      const page = await browser.newPage()

      // Navigate to the contract preview page
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

      await page.goto(`${baseUrl}/contracts/preview/${id}`, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      })

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      })

      await browser.close()

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${contract.number}.pdf"`,
        },
      })
    } catch {
      // Puppeteer not installed or failed — return JSON for client-side generation
      console.warn('[API] Puppeteer not available, returning contract data for client-side PDF generation')

      return NextResponse.json({
        data: {
          id: contract.id,
          number: contract.number,
          businessLine: contract.businessLine.slug,
          businessLineName: contract.businessLine.name,
          clientName: contract.client.companyName,
          sections: contract.sections,
          anexa2: contract.anexa2,
          companyDetails: contract.companyDetails,
          clientDetails: contract.clientDetails,
          value: contract.value,
          currency: contract.currency,
          duration: contract.duration,
          startDate: contract.startDate.toISOString(),
          endDate: contract.endDate.toISOString(),
        },
        meta: {
          pdfMethod: 'client-side',
          message: 'Puppeteer not available. Use client-side print/PDF generation.',
        },
      })
    }
  } catch (error) {
    console.error('[API] POST /api/contracts/[id]/pdf error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
