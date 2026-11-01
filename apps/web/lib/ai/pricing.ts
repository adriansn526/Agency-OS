// ─── AI model pricing ───
// One price table for every place that estimates AI cost (usage log, provider cost report, tenant billing).
// USD per 1M tokens. Thinking tokens are billed as output tokens. Source: ai.google.dev/gemini-api/docs/pricing
// (checked 2026-11-01) and platform.openai.com pricing for the OpenAI models.

export interface ModelPrice { input: number; output: number }

interface PriceStep extends ModelPrice {
  /** price applies from this date (UTC, inclusive); the first step has no date */
  from?: string
  /** for prompts longer than this many tokens the long-prompt rates apply */
  longPrompt?: { over: number } & ModelPrice
}

const FLASH_3: PriceStep[] = [
  { input: 0.75, output: 3.75 },
  { from: '2027-01-01', input: 1.5, output: 7.5 }, // announced price increase
]

const TABLE: Record<string, PriceStep[]> = {
  'gemini-3.1-flash-lite': [{ input: 0.25, output: 1.5 }],
  'gemini-3.6-flash': FLASH_3,
  'gemini-3.8-flash': FLASH_3,
  'gemini-3.1-pro-preview': [{ input: 2.0, output: 12.0, longPrompt: { over: 200_000, input: 4.0, output: 18.0 } }],
  // older Gemini models (kept for the history of the usage log)
  'gemini-2.5-pro': [{ input: 1.25, output: 10.0 }],
  'gemini-2.0-flash-lite': [{ input: 0.075, output: 0.3 }],
  'gpt-4o': [{ input: 2.5, output: 10.0 }],
  'gpt-4o-mini': [{ input: 0.15, output: 0.6 }],
  'gpt-4-turbo': [{ input: 10.0, output: 30.0 }],
  'gpt-3.5-turbo': [{ input: 0.5, output: 1.5 }],
  'gpt-4o-realtime-preview': [{ input: 5.0, output: 20.0 }],
}

/** Used for models missing from the table: the most expensive known rates, so unknown usage is never under-billed. */
export const FALLBACK_PRICE: ModelPrice = { input: 2.0, output: 12.0 }

/** Google retired these for new accounts (HTTP 404 "no longer available to new users"); calls are redirected to the successor. */
export const RETIRED_MODELS: Record<string, string> = {
  'gemini-2.5-flash': 'gemini-3.8-flash',
  'gemini-2.5-flash-lite': 'gemini-3.1-flash-lite',
  'gemini-2.5-pro': 'gemini-3.1-pro-preview',
  'gemini-2.0-flash': 'gemini-3.8-flash',
  'gemini-2.0-flash-lite': 'gemini-3.1-flash-lite',
  'gemini-1.5-flash': 'gemini-3.8-flash',
  'gemini-1.5-pro': 'gemini-3.1-pro-preview',
}

export function normalizeModel(model: string | undefined): string | undefined {
  if (!model) return model
  return RETIRED_MODELS[model] ?? model
}

export function priceFor(model: string, promptTokens = 0, at: Date = new Date()): ModelPrice {
  const steps = TABLE[model]
  if (!steps) return FALLBACK_PRICE
  const day = at.toISOString().slice(0, 10)
  let step: PriceStep = steps[0] as PriceStep
  for (const s of steps) if (s.from && s.from <= day) step = s
  if (step.longPrompt && promptTokens > step.longPrompt.over) return { input: step.longPrompt.input, output: step.longPrompt.output }
  return { input: step.input, output: step.output }
}

export interface TokenUsage { promptTokens: number; completionTokens: number; thinkingTokens?: number }

/** Cost in USD. Thinking tokens count as output. */
export function costUsd(model: string, usage: TokenUsage, at: Date = new Date()): number {
  const p = priceFor(model, usage.promptTokens, at)
  const out = usage.completionTokens + (usage.thinkingTokens ?? 0)
  return (usage.promptTokens * p.input + out * p.output) / 1_000_000
}
