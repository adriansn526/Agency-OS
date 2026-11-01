// ═══════════════════════════════════════════════════════
// Provider Cost Fetcher
// ═══════════════════════════════════════════════════════
// Fetches real costs from AI/telecom provider APIs.
// Used by the AI Usage & Billing dashboard.

import { costUsd } from "@/lib/ai/pricing"

// ─── OpenAI Costs ───

const OPENAI_ADMIN_KEY = process.env.OPENAI_ADMIN_API_KEY || ""

export interface ProviderCostBreakdown {
  provider: string
  totalUsd: number
  totalEur: number
  source: "api" | "estimated" | "balance"
  details: Record<string, unknown>
}

export interface ProviderCostReport {
  period: { start: string; end: string }
  providers: ProviderCostBreakdown[]
  totalCostUsd: number
  totalCostEur: number
}

// USD to EUR approximate rate
const USD_TO_EUR = 0.92

function usdToEur(usd: number): number {
  return Math.round(usd * USD_TO_EUR * 100) / 100
}

/**
 * Fetch real costs from OpenAI Organization API.
 * Requires an admin API key (sk-admin-...).
 * Falls back to estimation if not available.
 */
export async function fetchOpenAICosts(
  startDate: Date,
  endDate: Date
): Promise<ProviderCostBreakdown> {
  if (!OPENAI_ADMIN_KEY) {
    return {
      provider: "openai",
      totalUsd: 0,
      totalEur: 0,
      source: "estimated",
      details: { error: "OPENAI_ADMIN_API_KEY not configured" },
    }
  }

  try {
    // OpenAI costs API uses Unix timestamps
    // end_time must be strictly after start_time (at least next day)
    const startTime = Math.floor(startDate.getTime() / 1000)
    const endNext = new Date(endDate)
    endNext.setDate(endNext.getDate() + 1)
    endNext.setHours(0, 0, 0, 0)
    const endTime = Math.floor(endNext.getTime() / 1000)

    const res = await fetch(
      `https://api.openai.com/v1/organization/costs?start_time=${startTime}&end_time=${endTime}&group_by=line_item`,
      {
        headers: {
          Authorization: `Bearer ${OPENAI_ADMIN_KEY}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    )

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.error(`[ProviderCosts] OpenAI API ${res.status}:`, errText.substring(0, 200))
      return {
        provider: "openai",
        totalUsd: 0,
        totalEur: 0,
        source: "estimated",
        details: { error: `OpenAI API returned ${res.status}` },
      }
    }

    const data = await res.json()
    
    // Parse costs response — aggregate across buckets
    let totalUsd = 0
    const modelCosts: Record<string, number> = {}

    // data.data is an array of time buckets, each with results array
    if (Array.isArray(data.data)) {
      for (const bucket of data.data) {
        if (Array.isArray(bucket.results)) {
          for (const result of bucket.results) {
            const lineItem = result.line_item || "unknown"
            const costUsd = parseFloat(result.amount?.value || "0")
            totalUsd += costUsd
            modelCosts[lineItem] = (modelCosts[lineItem] || 0) + costUsd
          }
        }
      }
    }

    return {
      provider: "openai",
      totalUsd: Math.round(totalUsd * 10000) / 10000,
      totalEur: usdToEur(totalUsd),
      source: "api",
      details: {
        models: Object.entries(modelCosts).map(([model, usd]) => ({
          model,
          costUsd: Math.round(usd * 10000) / 10000,
        })),
      },
    }
  } catch (err: any) {
    console.error("[ProviderCosts] OpenAI fetch error:", err.message)
    return {
      provider: "openai",
      totalUsd: 0,
      totalEur: 0,
      source: "estimated",
      details: { error: err.message },
    }
  }
}

/**
 * Fetch Twilio real costs for a period via Usage Records API + current balance.
 * Uses /Usage/Records/Daily.json with Category=totalprice for actual spend.
 */
export async function fetchTwilioCosts(
  startDate: Date,
  endDate: Date
): Promise<ProviderCostBreakdown> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || ""
  const authToken = process.env.TWILIO_AUTH_TOKEN || ""

  if (!accountSid || !authToken) {
    return {
      provider: "twilio",
      totalUsd: 0,
      totalEur: 0,
      source: "balance",
      details: { error: "TWILIO credentials not configured" },
    }
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

  try {
    // Format dates for Twilio API (YYYY-MM-DD)
    const startStr = startDate.toISOString().split("T")[0]
    const endStr = endDate.toISOString().split("T")[0]

    // Fetch real usage costs for the period
    const [usageRes, balanceRes] = await Promise.all([
      fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Usage/Records/Daily.json?StartDate=${startStr}&EndDate=${endStr}&Category=totalprice`,
        {
          headers: { Authorization: `Basic ${credentials}` },
          cache: "no-store",
        }
      ),
      fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`,
        {
          headers: { Authorization: `Basic ${credentials}` },
          cache: "no-store",
        }
      ),
    ])

    let totalUsd = 0
    const dailyCosts: { date: string; costUsd: number }[] = []

    if (usageRes.ok) {
      const usageData = await usageRes.json()
      for (const record of usageData.usage_records || []) {
        const cost = parseFloat(record.price || "0")
        totalUsd += cost
        if (cost > 0) {
          dailyCosts.push({
            date: record.start_date,
            costUsd: cost,
          })
        }
      }
    }

    let balance = 0
    if (balanceRes.ok) {
      const balanceData = await balanceRes.json()
      balance = parseFloat(balanceData.balance || "0")
    }

    return {
      provider: "twilio",
      totalUsd: Math.round(totalUsd * 10000) / 10000,
      totalEur: usdToEur(totalUsd),
      source: totalUsd > 0 ? "api" : "balance",
      details: {
        balance,
        balanceEur: usdToEur(balance),
        currency: "USD",
        dailyCosts,
        periodSpend: totalUsd,
      },
    }
  } catch (err: any) {
    console.error("[ProviderCosts] Twilio fetch error:", err.message)
    return {
      provider: "twilio",
      totalUsd: 0,
      totalEur: 0,
      source: "balance",
      details: { error: err.message },
    }
  }
}

/**
 * Estimate Gemini costs from local AiUsageLog data.
 * Google doesn't provide a billing API for API keys.
 */
export function estimateFromTokens(
  _provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  thinkingTokens = 0
): number {
  return costUsd(model, { promptTokens, completionTokens, thinkingTokens })
}

/**
 * Fetch ElevenLabs costs/usage.
 */
export async function fetchElevenLabsCosts(
  startDate: Date,
  endDate: Date
): Promise<ProviderCostBreakdown> {
  const apiKey = process.env.ELEVENLABS_API_KEY || ""
  
  if (!apiKey) {
    return {
      provider: "elevenlabs",
      totalUsd: 0,
      totalEur: 0,
      source: "balance",
      details: { error: "ELEVENLABS_API_KEY not configured" },
    }
  }

  try {
    const res = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    })

    if (!res.ok) {
      return {
        provider: "elevenlabs",
        totalUsd: 0,
        totalEur: 0,
        source: "estimated",
        details: { error: `ElevenLabs API returned ${res.status}` },
      }
    }

    const data = await res.json()
    const sub = data.subscription || {}
    
    // Calculate estimated cost (e.g., $0.30 per 1000 characters over limit or based on plan)
    // For now we just show the usage balance
    const charsUsed = sub.character_count || 0
    const charsLimit = sub.character_limit || 0
    
    return {
      provider: "elevenlabs",
      totalUsd: 0, // Hard to get exact date-range cost from this endpoint, so we return 0 and show balance info
      totalEur: 0,
      source: "balance",
      details: {
        balance: 0, // No direct balance
        charsUsed,
        charsLimit,
      },
    }
  } catch (err: any) {
    return {
      provider: "elevenlabs",
      totalUsd: 0,
      totalEur: 0,
      source: "balance",
      details: { error: err.message },
    }
  }
}

/**
 * Fetch all provider costs for a given period.
 */
export async function fetchAllProviderCosts(
  startDate: Date,
  endDate: Date
): Promise<ProviderCostReport> {
  const [openai, twilio, elevenlabs] = await Promise.all([
    fetchOpenAICosts(startDate, endDate),
    fetchTwilioCosts(startDate, endDate),
    fetchElevenLabsCosts(startDate, endDate),
  ])

  const providers = [openai, twilio, elevenlabs]
  const totalCostUsd = providers.reduce((sum, p) => sum + p.totalUsd, 0)

  return {
    period: {
      start: startDate.toISOString().split("T")[0]!,
      end: endDate.toISOString().split("T")[0]!,
    },
    providers,
    totalCostUsd,
    totalCostEur: usdToEur(totalCostUsd),
  }
}
