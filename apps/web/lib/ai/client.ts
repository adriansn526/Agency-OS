// ─── LLM Client ───
// Central AI interface — resolves provider from Settings, provides generateText/streamText/generateJSON
// Ported from DNA Studio (MIT) — adapted to use Agency OS settings store

import type { LLMProvider, LLMMessage, LLMOptions, ProviderType } from './types'
import { logUsage } from './usage'
import { costUsd, normalizeModel } from './pricing'

let cachedProvider: LLMProvider | null = null
let cachedCacheKey: string | null = null
let resolvedProviderType: ProviderType = 'gemini'
let resolvedModel: string = 'gemini-3.6-flash'

/**
 * Resolve the configured LLM provider from Settings store or env vars.
 */
export async function getLLMProvider(): Promise<LLMProvider> {
  let providerType: ProviderType = 'gemini'
  let apiKey: string | undefined
  let model: string | undefined

  try {
    // Try reading from file-based settings (same pattern as integrations)
    const { readFileSync, existsSync } = await import('fs')
    const { join } = await import('path')
    const settingsFile = join(process.cwd(), '.data', 'settings.json')

    if (existsSync(settingsFile)) {
      const raw = readFileSync(settingsFile, 'utf-8')
      const settings = JSON.parse(raw)
      if (settings.integrations?.ai) {
        providerType = (settings.integrations.ai.provider || 'gemini') as ProviderType
        apiKey = settings.integrations.ai.apiKey || undefined
        model = settings.integrations.ai.model || undefined
      }
    }
  } catch {
    // Fall back to env vars
  }

  // Env var overrides (always available as fallback)
  if (!apiKey) {
    if (providerType === 'openai') apiKey = process.env.OPENAI_API_KEY
    else if (providerType === 'gemini') apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
  }
  if (!providerType && process.env.LLM_PROVIDER) {
    providerType = process.env.LLM_PROVIDER as ProviderType
  }

  model = normalizeModel(model) // models Google retired are redirected to their successor
  const cacheKey = `${providerType}:${apiKey || 'env'}:${model || 'default'}`
  if (cachedProvider && cachedCacheKey === cacheKey) {
    return cachedProvider
  }

  switch (providerType) {
    case 'openai': {
      const { OpenAIProvider } = await import('./providers/openai')
      cachedProvider = new OpenAIProvider(apiKey, model)
      break
    }
    case 'gemini': {
      const { GeminiProvider } = await import('./providers/gemini')
      cachedProvider = new GeminiProvider(apiKey, model)
      break
    }
    default:
      throw new Error(`Unknown LLM provider: ${providerType}`)
  }

  cachedCacheKey = cacheKey
  resolvedProviderType = providerType
  resolvedModel = model || (providerType === 'openai' ? 'gpt-4o' : 'gemini-3.6-flash')
  return cachedProvider!
}

/**
 * Reset cached provider (call after settings change)
 */
export function resetLLMCache() {
  cachedProvider = null
  cachedCacheKey = null
}

/**
 * Generate text from messages — returns the full response string.
 */
export async function generateText(
  messages: LLMMessage[],
  options?: LLMOptions & { action?: string; detail?: string }
): Promise<string> {
  const provider = await getLLMProvider()
  const response = await provider.generate(messages, options)

  // Log usage
  if (response.usage) {
    logUsage({
      provider: resolvedProviderType,
      model: resolvedModel,
      promptTokens: response.usage.promptTokens,
      completionTokens: response.usage.completionTokens,
      thinkingTokens: response.usage.thinkingTokens,
      action: options?.action || 'generate',
      detail: options?.detail,
    })
  }

  return response.content
}

/**
 * Stream text from messages — yields chunks as they arrive.
 */
export async function* streamText(
  messages: LLMMessage[],
  options?: LLMOptions
): AsyncGenerator<string> {
  const provider = await getLLMProvider()
  for await (const chunk of provider.stream(messages, options)) {
    yield chunk.content
  }
}

/**
 * Generate structured JSON from messages — parses the first JSON object from the response.
 */
export async function generateJSON<T>(
  messages: LLMMessage[],
  options?: LLMOptions
): Promise<T> {
  const content = await generateText(messages, {
    ...options,
    json: true,
    temperature: options?.temperature ?? 0,
  })

  // Extract the first JSON object from the response regardless of surrounding text
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error(`LLM did not return valid JSON. Response: ${content.slice(0, 300)}`)
  }
  return JSON.parse(match[0]) as T
}


export interface GenerationResult {
  content: string
  provider: ProviderType
  model: string
  usage: { promptTokens: number; completionTokens: number; thinkingTokens: number }
  finishReason?: string
  truncated: boolean
  /** estimated provider cost in USD (thinking tokens included) */
  costUsd: number
}

/**
 * One-off call with an explicit provider/model/key (not cached): used for billed tenant calls, which must run on the
 * platform's own key and report exactly what they used. Throws on provider errors; the caller decides what to charge.
 */
export async function generateWithUsage(
  messages: LLMMessage[],
  opts: LLMOptions & { provider: ProviderType; model: string; apiKey: string; action?: string; detail?: string }
): Promise<GenerationResult> {
  const model = normalizeModel(opts.model) as string
  let provider: LLMProvider
  if (opts.provider === 'openai') {
    const { OpenAIProvider } = await import('./providers/openai')
    provider = new OpenAIProvider(opts.apiKey, model)
  } else {
    const { GeminiProvider } = await import('./providers/gemini')
    provider = new GeminiProvider(opts.apiKey, model)
  }
  const r = await provider.generate(messages, { temperature: opts.temperature, maxTokens: opts.maxTokens, json: opts.json })
  const usage = { promptTokens: r.usage?.promptTokens ?? 0, completionTokens: r.usage?.completionTokens ?? 0, thinkingTokens: r.usage?.thinkingTokens ?? 0 }
  const cost = costUsd(model, usage)
  logUsage({ provider: opts.provider, model, ...usage, cost, action: opts.action || 'generate', detail: opts.detail })
  return { content: r.content, provider: opts.provider, model, usage, finishReason: r.finishReason, truncated: !!r.truncated, costUsd: cost }
}
