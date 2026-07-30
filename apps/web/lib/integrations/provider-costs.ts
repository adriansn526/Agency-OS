// ═══════════════════════════════════════════════════════
// Provider Cost Fetcher
// ═══════════════════════════════════════════════════════
// Fetches real costs from AI/telecom provider APIs.
// Used by the AI Usage & Billing dashboard.

// ─── OpenAI Costs ───

const OPENAI_ADMIN_KEY = process.env.OPENAI_ADMIN_API_KEY || ""

// Cost table per 1M tokens (USD) — fallback for estimation
const OPENAI_COST_TABLE: Record<string, { input: number; output: number }> = {
  "gpt-4o":                  { input: 2.50,  output: 10.0 },
  "gpt-4o-mini":             { input: 0.15,  output: 0.60 },
  "gpt-4-turbo":             { input: 10.0,  output: 30.0 },
  "gpt-3.5-turbo":           { input: 0.50,  output: 1.50 },
  "gpt-4o-realtime-preview": { input: 5.0,   output: 20.0 },
}

const GEMINI_COST_TABLE: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash":      { input: 0.15,  output: 0.60 },
  "gemini-2.5-pro":        { input: 1.25,  output: 10.0 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.30 },
}

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
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const table = provider === "openai" ? OPENAI_COST_TABLE : GEMINI_COST_TABLE
  const rates = table[model] || { input: 1.0, output: 3.0 }
  return (promptTokens * rates.input + completionTokens * rates.output) / 1_000_000
}

/**
 * Fetch all provider costs for a given period.
 */
export async function fetchAllProviderCosts(
  startDate: Date,
  endDate: Date
): Promise<ProviderCostReport> {
  const [openai, twilio] = await Promise.all([
    fetchOpenAICosts(startDate, endDate),
    fetchTwilioCosts(startDate, endDate),
  ])

  const providers = [openai, twilio]
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
