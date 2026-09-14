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
        client: { select: { id: true, companyName: true, googleAdsCustomerId: true, gscSiteUrl: true } },
        businessLine: { select: { slug: true, name: true } },
      },
    })

    if (!report) return NextResponse.json({ error: 'Raport negăsit' }, { status: 404 })

    // Fetch projects
    const projects = await db.project.findMany({
      where: { 
        clientId: report.client.id, 
        status: { in: ['in_lucru', 'finalizat'] }
      },
      select: {
        name: true,
        status: true,
        metadata: true,
        updatedAt: true
      }
    })

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

    // Append projects data
    reportData.active_projects = projects.map(p => ({
      name: p.name,
      status: p.status,
      tasks_done: Array.isArray((p.metadata as any)?.checklist) 
        ? ((p.metadata as any).checklist).filter((c: any) => c.done).map((c: any) => c.item) 
        : []
    }))

    // Generate AI interpretation
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const targetName = report.domain ? report.domain : report.client.companyName
    const prompt = `Ești analist de marketing digital pentru agenția ${report.businessLine.name}. 
Analizează datele de performanță pentru domeniul / website-ul "${targetName}" în perioada ${dateFrom} — ${dateTo}.

IMPORTANT: Acest raport este destinat CLIENTULUI final. Tonul trebuie să fie pozitiv, profesional și axat pe REZULTATE și progres. Concentrează-te pe ce s-a realizat cu succes, pe punctele forte și pe valoarea adusă. EVITĂ detaliile tehnice negative sau problemele interne (precum erori de cod, canibalizare SEO, etc.), deoarece acele informații sunt strict pentru uzul intern al agenției.

Date disponibile:
${JSON.stringify(reportData, null, 2)}

Generează o interpretare tehnică și clară, folosind formatare **Markdown**. Structura trebuie să respecte EXACT următoarele secțiuni, folosind heading-uri, liste cu \`-\` sau \`*\` și bold unde e necesar:

### Rezumat General Performanță
(Un paragraf introductiv, ex: Traficul a crescut, campaniile rulează bine. Subliniază creșterile.)

### Observație Strategică
(Un insight major, o analiză profundă. Scrie-o ca text simplu, va fi evidențiată vizual mai târziu în UI)

### SEO (Trafic Organic)
- Punct forte 1
- Punct forte 2...

### Performanță Google Ads
- Punct cheie 1
- Punct cheie 2...

### Proiecte și WebDev (Dacă există îmbunătățiri la site)
- Enumeră îmbunătățirile/task-urile făcute (din secțiunea active_projects)
- Dacă nu sunt, omite secțiunea

### Pașii Următori
- Ce urmează să facem (2-3 puncte acționabile)

De asemenea, generează EXACT 3 highlights (metrice cheie scurte) în format JSON pentru a fi afișate sub formă de carduri. Nu pune mai mult de 3, deoarece designul emailului suportă doar 3 carduri.

Răspunde STRICT în acest format JSON:
{"content": "aici pui tot textul formatat Markdown (cu ### etc)", "highlights": [{"label": "TOTAL CONVERSII", "value": "133", "trend": "+15%"}, {"label": "VIZITE GOOGLE ADS", "value": "19.841", "trend": ""}, {"label": "VIZITE ORGANICE", "value": "1.023", "trend": ""}]}
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
        generatedBy: 'gemini-3.6-flash',
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
