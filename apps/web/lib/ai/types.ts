// ─── AI / LLM Provider Abstraction ───
// Ported from DNA Studio (MIT) — adapted for Agency OS

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    /** reasoning tokens (Gemini "thoughts"): billed as output, not included in completionTokens */
    thinkingTokens?: number
  }
  /** provider's stop reason, normalised: the answer was cut because the output limit was reached */
  truncated?: boolean
  finishReason?: string
}

export interface LLMStreamChunk {
  content: string
  done: boolean
}

export interface LLMProvider {
  generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>
  stream(messages: LLMMessage[], options?: LLMOptions): AsyncGenerator<LLMStreamChunk>
}

export interface LLMOptions {
  temperature?: number
  maxTokens?: number
  json?: boolean
}

export type ProviderType = 'openai' | 'gemini'
