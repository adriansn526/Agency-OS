// ─── LLM Client ───
// Central AI interface — resolves provider from Settings, provides generateText/streamText/generateJSON
// Ported from DNA Studio (MIT) — adapted to use Agency OS settings store

import type { LLMProvider, LLMMessage, LLMOptions, ProviderType } from './types'
import { logUsage } from './usage'

let cachedProvider: LLMProvider | null = null
let cachedCacheKey: string | null = null
let resolvedProviderType: ProviderType = 'gemini'
let resolvedModel: string = 'gemini-2.5-flash'

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
    else if (providerType === 'gemini') apiKey = process.env.GOOGLE_API_KEY
  }
  if (!providerType && process.env.LLM_PROVIDER) {
    providerType = process.env.LLM_PROVIDER as ProviderType
  }

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
  resolvedModel = model || (providerType === 'openai' ? 'gpt-4o' : 'gemini-2.5-flash')
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
