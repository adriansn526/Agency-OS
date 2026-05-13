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
  }
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
