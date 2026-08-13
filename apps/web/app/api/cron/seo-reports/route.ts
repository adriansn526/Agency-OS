import { NextRequest, NextResponse } from "next/server"
import { db } from "@repo/db"
import { getSiteMetrics, getTopPages, getTopQueries } from "@/lib/integrations/gsc"
import { generateText } from "@/lib/ai/client"

export const maxDuration = 60 // Vercel maximum duration (increase if Pro plan allows 300s)

export async function GET(req: NextRequest) {
  // 1. Cron Security Check
  const authHeader = req.headers.get("authorization")
  if (
    process.env.NODE_ENV !== "development" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    req.nextUrl.searchParams.get("force") !== "true" // Allow manual trigger for testing
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const telegramToken = process.env.SEO_TELEGRAM_BOT_TOKEN
  if (!telegramToken) {
    return NextResponse.json({ error: "SEO_TELEGRAM_BOT_TOKEN not configured" }, { status: 500 })
  }

  try {
    // 2. Fetch Projects with SEO Notifications Enabled
    const projects = await db.project.findMany({
      include: { client: true },
    })

    const results = []

    for (const project of projects) {
      const meta = project.metadata as any
      const seoConfig = meta?.seoNotifications

      if (!seoConfig?.enabled || !seoConfig?.telegramChatId) continue

      const gscUrl = project.client?.gscSiteUrl || meta?.gscSiteUrl
      if (!gscUrl) continue
      const siteUrl = gscUrl as string

      const thresholdPct = seoConfig.thresholdPct || 15
      const chatId = seoConfig.telegramChatId

      // 3. Date Math (Last 7 days vs Previous 7 days)
      const today = new Date()
      
      const last7Start = new Date(today)
      last7Start.setDate(today.getDate() - 7)
      
      const prev7Start = new Date(today)
      prev7Start.setDate(today.getDate() - 14)
      const prev7End = new Date(today)
      prev7End.setDate(today.getDate() - 8)

      const dLast7Start = last7Start.toISOString().split("T")[0]!
      const dLast7End = today.toISOString().split("T")[0]!
      const dPrev7Start = prev7Start.toISOString().split("T")[0]!
      const dPrev7End = prev7End.toISOString().split("T")[0]!

      // 4. Fetch GSC Data
      let currentMetrics, previousMetrics
      try {
        currentMetrics = await getSiteMetrics(siteUrl, dLast7Start, dLast7End)
        previousMetrics = await getSiteMetrics(siteUrl, dPrev7Start, dPrev7End)
      } catch (err: any) {
        console.error(`[SEO Cron] Failed to fetch GSC data for ${project.name}:`, err.message)
        continue
      }

      const currentClicks = currentMetrics.clicks || 0
      const previousClicks = previousMetrics.clicks || 0

      // Calculate Delta
      const delta = previousClicks > 0 
        ? ((currentClicks - previousClicks) / previousClicks) * 100 
        : (currentClicks > 0 ? 100 : 0) // if previous was 0 and now we have >0 clicks, it's 100% growth

      // 5. Check Recent Interventions (Tasks)
      const allTasks = meta?.tasks || []
      const recentDoneTasks = allTasks
        .filter((t: any) => t.status === 'done')
        .slice(-5) // luăm ultimele 5 task-uri finalizate pentru context

      // 6. Anomaly & Stagnation Check
      const isAnomaly = Math.abs(delta) >= thresholdPct
      const isStagnant = delta < 5 // Creștere sub 5% sau chiar scădere
      const hasRecentInterventions = recentDoneTasks.length > 0
      const triggerAlert = isAnomaly || (isStagnant && hasRecentInterventions)

      if (triggerAlert) {
        // Fetch deeper insights to explain the anomaly/stagnation
        const topPages = await getTopPages(siteUrl, dLast7Start, dLast7End, 5)
        const topQueries = await getTopQueries(siteUrl, dLast7Start, dLast7End, 5)

        // Fetch PostHog Data if available
        let posthogData = null
        if (meta?.posthogProjectId) {
          try {
            const { getDomainFullAnalytics } = await import("@/lib/integrations/posthog")
            const domain = siteUrl.replace(/https?:\/\//, '').replace('sc-domain:', '').split('/')[0]
            posthogData = await getDomainFullAnalytics(meta.posthogProjectId, domain, dLast7Start, dLast7End)
          } catch (phErr) {
            console.error(`[SEO Cron] Failed to fetch PostHog data for ${project.name}:`, phErr)
          }
        }

        // Formulate AI Prompt
        const prompt = `
Tu ești un agent AI specializat pe SEO și analiză de date.
Analizează următoarele performanțe din Google Search Console pentru proiectul "${project.name}" (Client: ${project.client?.companyName || 'Necunoscut'}).

## Date Macro (Ultimele 7 zile vs Precedentele 7 zile)
- Click-uri perioada curentă: ${currentClicks} (CTR: ${currentMetrics.ctr?.toFixed(2)}%, Poziție Medie: ${currentMetrics.position?.toFixed(1)})
- Click-uri perioada anterioară: ${previousClicks} (CTR: ${previousMetrics.ctr?.toFixed(2)}%, Poziție Medie: ${previousMetrics.position?.toFixed(1)})
- Fluctuație totală trafic: ${delta > 0 ? '+' : ''}${delta.toFixed(1)}%

## Date Micro (Top Pagini - Ultimele 7 zile)
${JSON.stringify(topPages, null, 2)}

## Date Micro (Top Cuvinte Cheie - Ultimele 7 zile)
${JSON.stringify(topQueries, null, 2)}

${hasRecentInterventions ? `## Intervenții Recente (Task-uri Finalizate de Echipă)\n${JSON.stringify(recentDoneTasks.map((t:any) => t.title || t.name), null, 2)}` : ''}

${posthogData ? `## Date de Comportament PostHog (Ultimele 7 zile)\n- Sesiuni totale: ${posthogData.domainTraffic?.sessions}\n- Bounce Rate: ${posthogData.bounceRate?.bounceRate}%\n- Top 3 Pagini accesate: ${JSON.stringify(posthogData.topPages?.slice(0,3).map((p: any) => p.url))}` : ''}

**Instrucțiuni:**
Generează o notificare de Telegram atractivă, scurtă și plină de insight-uri.
1. Ce s-a întâmplat: Creștere, Scădere sau Stagnare.
${hasRecentInterventions && isStagnant ? '2. ALARMĂ DE STAGNARE: Menționează că echipa a finalizat recent task-uri (listează-le pe scurt) dar traficul nu a crescut conform așteptărilor. Găsește posibile cauze (ex: articolele noi încă nu primesc afișări, posibile probleme de indexare).' : '2. Explică DE CE a fluctuat traficul bazat pe pagini și cuvinte cheie.'}
3. Acțiune recomandată. ${posthogData ? 'Corelează traficul organic cu bounce rate-ul/sesiunile din PostHog.' : ''}
Folosește emoji-uri (ex: 🚨, 📉, 📈, ⚠️).
Păstrează mesajul concis (maxim 2-3 paragrafe scurte). Nu folosi introduceri robotice ("Iată analiza"). Scrie direct mesajul.
`

        // 7. Generate Response via LLM
        try {
          const llmResponse = await generateText([
            { role: "system", content: "You are a top-tier SEO analyst." },
            { role: "user", content: prompt }
          ], { action: "seo-anomaly-report", temperature: 0.7 })

          // 8. Dispatch to Telegram
          const telegramRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: llmResponse,
              parse_mode: "Markdown"
            })
          })

          if (!telegramRes.ok) {
            console.error(`[SEO Cron] Telegram send failed for ${project.name}:`, await telegramRes.text())
          } else {
            results.push({ project: project.name, delta: delta.toFixed(1) + "%", status: "Report sent" })
          }

        } catch (llmErr: any) {
          console.error(`[SEO Cron] LLM generation failed for ${project.name}:`, llmErr.message)
        }
      } else {
        results.push({ project: project.name, delta: delta.toFixed(1) + "%", status: "No anomaly (below threshold)" })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error("[SEO Cron] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
