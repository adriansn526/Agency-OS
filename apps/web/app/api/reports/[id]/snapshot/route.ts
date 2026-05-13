import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// ─── GET /api/reports/[id]/snapshot ───
// Returns all snapshots for a report
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const snapshots = await db.reportSnapshot.findMany({
      where: { reportId: id },
      orderBy: { dateFrom: 'desc' },
    })
    return NextResponse.json({ data: snapshots })
  } catch (error: any) {
    console.error('[API] GET /api/reports/[id]/snapshot error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── POST /api/reports/[id]/snapshot ───
// Generates AI interpretation for a date range
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { dateFrom, dateTo } = body

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'dateFrom și dateTo sunt obligatorii' }, { status: 400 })
    }

    const report = await db.clientReport.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true, googleAdsCustomerId: true, gscSiteUrl: true } },
        businessLine: { select: { slug: true, name: true } },
      },
    })

    if (!report) return NextResponse.json({ error: 'Raport negăsit' }, { status: 404 })

    // Check if snapshot already exists
    const existing = await db.reportSnapshot.findUnique({
      where: { reportId_dateFrom_dateTo: { reportId: id, dateFrom: new Date(dateFrom), dateTo: new Date(dateTo) } },
    })
    if (existing) {
      return NextResponse.json({ data: existing, message: 'Interpretare existentă' })
    }

    // Fetch data from the public data API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3100'
    let reportData: any = {}
    try {
      const res = await fetch(`${baseUrl}/api/reports/public/${report.token}/data?from=${dateFrom}&to=${dateTo}`)
      if (res.ok) {
        const json = await res.json()
        reportData = json.data || {}
      }
    } catch (err) {
      console.warn('[Snapshot] Failed to fetch report data:', err)
    }

    // Generate AI interpretation
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `Ești analist de marketing digital pentru agenția ${report.businessLine.name}. 
Analizează datele de performanță pentru clientul "${report.client.companyName}" în perioada ${dateFrom} — ${dateTo}.

Date disponibile:
${JSON.stringify(reportData, null, 2)}

Generează o interpretare concisă (3-5 paragrafe, în limba română) care:
1. Evidențiază rezultatele principale (conversii, trend-uri)
2. Identifică ce a funcționat bine
3. Sugerează oportunități de îmbunătățire
4. Compară metrici relevante (ROAS, CTR, poziție organică)

Tonul trebuie să fie profesional dar accesibil — clientul nu e expert tehnic.
Nu folosi formatare markdown complexă, doar text simplu cu paragrafe.

De asemenea, generează 3-5 highlights în format JSON:
[{"label": "ROAS", "value": "4.2x", "trend": "+15%"}, ...]

Răspunde STRICT în format JSON:
{"content": "text interpretare...", "highlights": [...]}
`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    
    // Parse AI response
    let content = ''
    let highlights: unknown[] = []
    try {
      const cleanJson = text.replace(/```json\n?|```\n?/g, '').trim()
      const parsed = JSON.parse(cleanJson)
      content = parsed.content || text
      highlights = parsed.highlights || []
    } catch {
      content = text
    }

    // Save snapshot
    const snapshot = await db.reportSnapshot.create({
      data: {
        reportId: id,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        content,
        highlights: highlights as any,
        generatedBy: 'gemini-2.5-flash',
      },
    })

    return NextResponse.json({
      data: snapshot,
      message: 'Interpretare AI generată cu succes!',
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API] POST /api/reports/[id]/snapshot error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
