// ═══════════════════════════════════════════════════════
// Agency-OS — Real Provider Costs API
// ═══════════════════════════════════════════════════════
// Returns real costs from provider APIs + per-tenant breakdown.
// GET /api/intraconstruct/costs?start=2026-06-01&end=2026-06-30

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  fetchAllProviderCosts,
  estimateFromTokens,
} from "@/lib/integrations/provider-costs"
import { icApi } from "@/lib/integrations/intraconstruct"

// Plan display info
const PLAN_INFO: Record<string, { label: string; monthlyEur: number; onetimeEur?: number }> = {
  starter:    { label: "Starter",    monthlyEur: 0 },
  pro:        { label: "Pro",        monthlyEur: 30 },
  enterprise: { label: "Enterprise", monthlyEur: 100 },
  onetime:    { label: "One-Time",   monthlyEur: 0, onetimeEur: 3500 },
}

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(req.url)
    const startParam = url.searchParams.get("start")
    const endParam = url.searchParams.get("end")

    // Default to current month
    const now = new Date()
    const startDate = startParam
      ? new Date(startParam + "T00:00:00Z")
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endParam
      ? new Date(endParam + "T23:59:59Z")
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // 1. Fetch real provider costs
    const providerCosts = await fetchAllProviderCosts(startDate, endDate)

    // 2. Fetch tenant usage breakdown from ERP
    let tenantData: { tenants: any[] } = { tenants: [] }
    try {
      tenantData = await icApi.getTenants()
    } catch (err: any) {
      console.error("[costs] Failed to fetch tenants:", err.message)
    }

    // 3. Calculate per-tenant estimated costs from their token usage
    const tenantCosts = tenantData.tenants.map((t: any) => {
      const usage = t.usage || { todayTokens: 0, monthTokens: 0, monthCostUsd: 0 }
      const estimatedCostUsd = usage.monthCostUsd || 0
      const estimatedCostEur = Math.round(estimatedCostUsd * 0.92 * 100) / 100

      const planInfo = PLAN_INFO[t.plan] || PLAN_INFO.starter

      return {
        tenantId: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        planLabel: planInfo.label,
        status: t.status,
        monthlyTokens: usage.monthTokens || 0,
        estimatedCostUsd,
        estimatedCostEur,
        subscriptionEur: planInfo.monthlyEur,
        onetimeEur: planInfo.onetimeEur || null,
      }
    })

    // 4. Calculate total estimated cost from all tenants
    const totalEstimatedUsd = tenantCosts.reduce(
      (sum: number, t: any) => sum + t.estimatedCostUsd, 0
    )
    const totalEstimatedEur = Math.round(totalEstimatedUsd * 0.92 * 100) / 100

    // 5. Distribute real costs proportionally (if available)
    const totalTokens = tenantCosts.reduce(
      (sum: number, t: any) => sum + t.monthlyTokens, 0
    )

    // Use real costs if available from providers, otherwise use estimated
    const hasRealCosts = providerCosts.providers.some((p) => p.source === "api" && p.totalUsd > 0)
    const effectiveTotalUsd = hasRealCosts ? providerCosts.totalCostUsd : totalEstimatedUsd
    const effectiveTotalEur = hasRealCosts ? providerCosts.totalCostEur : totalEstimatedEur

    const perTenant = tenantCosts.map((t: any) => {
      const share = totalTokens > 0 ? t.monthlyTokens / totalTokens : 0
      const realCostUsd = effectiveTotalUsd * share
      const realCostEur = effectiveTotalEur * share

      return {
        ...t,
        share: Math.round(share * 1000) / 10, // percentage with 1 decimal
        realCostUsd: Math.round(realCostUsd * 100) / 100,
        realCostEur: Math.round(realCostEur * 100) / 100,
      }
    })

    // 6. Revenue calculation
    const totalSubscriptionEur = tenantCosts
      .filter((t: any) => t.status === "active")
      .reduce((sum: number, t: any) => sum + t.subscriptionEur, 0)
    
    const totalOnetimeEur = tenantCosts
      .filter((t: any) => t.onetimeEur && t.status === "active")
      .reduce((sum: number, t: any) => sum + (t.onetimeEur || 0), 0)

    return NextResponse.json({
      period: {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      },
      providers: providerCosts.providers,
      costs: {
        totalUsd: Math.round(effectiveTotalUsd * 100) / 100,
        totalEur: Math.round(effectiveTotalEur * 100) / 100,
        source: hasRealCosts ? "api" : "estimated",
      },
      revenue: {
        monthlySubscriptionsEur: totalSubscriptionEur,
        onetimePaymentsEur: totalOnetimeEur,
      },
      perTenant,
    })
  } catch (error: any) {
    console.error("[api/intraconstruct/costs] Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
