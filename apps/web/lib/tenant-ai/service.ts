// ─── Billed AI actions for tenants (license key) ───
// A tenant (e.g. zoana-partners.com) calls these with its X-License-Key. Credits are charged per action from
// CreditPricingRule, only for a successful answer, and every call is written to CreditUsage with the real provider
// cost (thinking tokens included) so margins can be audited.

import { z } from 'zod'
import { db } from '@repo/db'
import { generateWithUsage, type GenerationResult } from '@/lib/ai/client'
import type { ProviderType } from '@/lib/ai/types'
import { buildPrompt, type Action } from './prompts'

export type Tier = 'standard' | 'pro'

export const ACTIONS = ['generate', 'analyze', 'review', 'snippet'] as const

/** serviceName in CreditPricingRule for each action (the pro tier of "analyze" has its own price). */
export function serviceNameFor(action: Action, tier: Tier): string {
  if (action === 'analyze' && tier === 'pro') return 'ai_article_analyze_pro'
  return { generate: 'ai_article_generate', analyze: 'ai_article_analyze', review: 'ai_article_review', snippet: 'ai_snippet' }[action]
}

/** Model per action. Overridable by env so a model can be swapped without a deploy of code. */
export function modelFor(action: Action, tier: Tier): { provider: ProviderType; model: string } {
  if (tier === 'pro' && action === 'analyze') return { provider: 'gemini', model: process.env.AI_MODEL_PRO || 'gemini-3.1-pro-preview' }
  if (action === 'snippet') return { provider: 'gemini', model: process.env.AI_MODEL_LITE || 'gemini-3.1-flash-lite' }
  return { provider: 'gemini', model: process.env.AI_MODEL_FLASH || 'gemini-3.8-flash' }
}

export const inputSchema = z.object({
  title: z.string().max(300).optional(),
  keyword: z.string().max(120).optional(),
  topic: z.string().max(300).optional(),
  text: z.string().max(60_000).optional(),
  words: z.number().int().min(300).max(3000).optional(),
  tier: z.enum(['standard', 'pro']).optional(),
}).strict()

export type Input = z.infer<typeof inputSchema>

const jsonOut = {
  analyze: z.object({
    scor_calitate: z.number().optional(),
    probleme_juridice: z.array(z.unknown()).default([]),
    lipsuri_de_continut: z.array(z.string()).default([]),
    recomandari_seo: z.array(z.string()).default([]),
    titluri_alternative: z.array(z.string()).default([]),
    rezumat_155_caractere: z.string().default(''),
  }),
  review: z.object({ modificari: z.array(z.string()).default([]), text_revizuit: z.string().min(20) }),
  snippet: z.object({ titluri_alternative: z.array(z.string()).default([]), rezumat_155_caractere: z.string().default('') }),
}

export class TenantAiError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) { super(message) }
}

// ─── rate limit (per tenant, in memory): protects the provider key from a runaway client ───
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 20
const hits = new Map<string, number[]>()
export function rateLimited(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) { hits.set(key, recent); return true }
  recent.push(now)
  hits.set(key, recent)
  return false
}

export async function authTenant(licenseKey: string | null) {
  if (!licenseKey) throw new TenantAiError(401, 'Missing license key')
  const t = await db.tenantInstance.findUnique({ where: { licenseKey }, select: { id: true, tenantSlug: true, status: true, balanceCredits: true } })
  if (!t) throw new TenantAiError(403, 'Invalid license key')
  if (t.status !== 'active') throw new TenantAiError(403, 'Instance suspended')
  return t
}

export async function balanceInfo(licenseKey: string | null) {
  const t = await authTenant(licenseKey)
  const rules = await db.creditPricingRule.findMany({ where: { serviceName: { startsWith: 'ai_' } }, orderBy: { creditsPerUnit: 'asc' } })
  return { balance: t.balanceCredits, prices: rules.map((r) => ({ service: r.serviceName, credits: r.creditsPerUnit, description: r.unitDescription })) }
}

function parseJson(content: string, schema: z.ZodType): unknown {
  const m = content.match(/\{[\s\S]*\}/)
  if (!m) throw new TenantAiError(502, 'The model did not return a valid answer. No credits were charged.')
  try { return schema.parse(JSON.parse(m[0])) } catch { throw new TenantAiError(502, 'The model answer had an unexpected shape. No credits were charged.') }
}

/** `deps` exists so tests can replace the provider call; production always uses the default. */
export async function runAction(licenseKey: string | null, action: Action, rawInput: unknown, deps: { generate: typeof generateWithUsage } = { generate: generateWithUsage }) {
  const tenant = await authTenant(licenseKey)
  if (rateLimited(tenant.tenantSlug)) throw new TenantAiError(429, 'Too many requests. Try again in a minute.')

  const parsed = inputSchema.safeParse(rawInput ?? {})
  if (!parsed.success) throw new TenantAiError(400, 'Invalid input')
  const input = parsed.data
  if (action === 'generate' ? !input.topic : !input.text) throw new TenantAiError(400, action === 'generate' ? 'topic is required' : 'text is required')

  const tier: Tier = input.tier === 'pro' && action === 'analyze' ? 'pro' : 'standard'
  const serviceName = serviceNameFor(action, tier)
  const rule = await db.creditPricingRule.findUnique({ where: { serviceName } })
  if (!rule) throw new TenantAiError(500, `Pricing rule ${serviceName} is not configured`)
  const credits = rule.creditsPerUnit
  if (tenant.balanceCredits < credits) throw new TenantAiError(402, 'Insufficient credits', { required: credits, balance: tenant.balanceCredits })

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  if (!apiKey) throw new TenantAiError(503, 'The AI provider is not configured')
  const { provider, model } = modelFor(action, tier)
  const prompt = buildPrompt(action, input)

  let gen: GenerationResult
  try {
    gen = await deps.generate(
      [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
      { provider, model, apiKey, json: prompt.json, maxTokens: prompt.maxTokens, temperature: action === 'generate' ? 0.6 : 0.3, action: `tenant:${action}`, detail: tenant.tenantSlug },
    )
  } catch (e) {
    console.error('[tenant-ai] provider error:', e instanceof Error ? e.message : e)
    throw new TenantAiError(502, 'The AI provider is unavailable. No credits were charged.')
  }
  if (gen.truncated) throw new TenantAiError(502, 'The answer was cut off because it was too long. No credits were charged.')

  let result: unknown
  if (action === 'generate') {
    if (gen.content.trim().length < 200) throw new TenantAiError(502, 'The model returned an empty answer. No credits were charged.')
    result = { markdown: gen.content.trim(), words: gen.content.split(/\s+/).filter(Boolean).length }
  } else {
    result = parseJson(gen.content, jsonOut[action])
  }

  // Charge atomically: the balance can never go negative, even with parallel requests.
  const charged = await db.$transaction(async (tx) => {
    const upd = await tx.tenantInstance.updateMany({ where: { id: tenant.id, balanceCredits: { gte: credits } }, data: { balanceCredits: { decrement: credits } } })
    if (upd.count !== 1) return null
    await tx.creditUsage.create({
      data: {
        instanceId: tenant.id, type: 'ai', amount: credits, detail: `${serviceName}${input.title ? `: ${input.title.slice(0, 80)}` : ''}`, provider: gen.provider, rawCostUsd: gen.costUsd,
        metadata: { action, tier, model: gen.model, promptTokens: gen.usage.promptTokens, completionTokens: gen.usage.completionTokens, thinkingTokens: gen.usage.thinkingTokens, finishReason: gen.finishReason ?? null },
      },
    })
    const now = await tx.tenantInstance.findUnique({ where: { id: tenant.id }, select: { balanceCredits: true } })
    return now?.balanceCredits ?? 0
  })
  if (charged === null) throw new TenantAiError(402, 'Insufficient credits', { required: credits })

  return { result, credits: { charged: credits, balance: charged }, usage: { model: gen.model, ...gen.usage } }
}
