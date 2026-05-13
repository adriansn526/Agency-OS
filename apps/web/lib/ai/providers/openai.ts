// ─── OpenAI Provider ───
// Ported from DNA Studio (MIT)

import OpenAI from 'openai'
import type { LLMProvider, LLMMessage, LLMResponse, LLMStreamChunk, LLMOptions } from '../types'

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI
  private model: string

  constructor(apiKey?: string, model?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    })
    this.model = model || process.env.OPENAI_MODEL || 'gpt-4o'
  }

  async generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      ...(options?.json && { response_format: { type: 'json_object' as const } }),
    })

    return {
      content: response.choices[0]?.message?.content || '',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
          }
        : undefined,
    }
  }

  async *stream(messages: LLMMessage[], options?: LLMOptions): AsyncGenerator<LLMStreamChunk> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
      ...(options?.json && { response_format: { type: 'json_object' as const } }),
    })

    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || ''
      const done = chunk.choices[0]?.finish_reason !== null
      if (content) {
        yield { content, done }
      }
    }
  }
}
