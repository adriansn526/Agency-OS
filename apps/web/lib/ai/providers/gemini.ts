// ─── Google Gemini Provider ───
// Ported from DNA Studio (MIT)

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMProvider, LLMMessage, LLMResponse, LLMStreamChunk, LLMOptions } from '../types'
import { normalizeModel } from '../pricing'

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI
  private modelName: string

  constructor(apiKey?: string, model?: string) {
    this.genAI = new GoogleGenerativeAI(apiKey || process.env.GOOGLE_API_KEY || '')
    this.modelName = normalizeModel(model || process.env.GEMINI_MODEL) || 'gemini-3.6-flash'
  }

  async generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 8192,
        ...(options?.json && { responseMimeType: 'application/json' }),
      },
    })

    const systemMsg = messages.find((m) => m.role === 'system')
    const nonSystemMsgs = messages.filter((m) => m.role !== 'system')

    const chat = model.startChat({
      ...(systemMsg && {
        systemInstruction: { role: 'user' as const, parts: [{ text: systemMsg.content }] },
      }),
      history: nonSystemMsgs.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      })),
    })

    const lastMsg = nonSystemMsgs[nonSystemMsgs.length - 1]
    const result = await chat.sendMessage(lastMsg!.content)
    const response = result.response

    const meta = response.usageMetadata as (typeof response.usageMetadata & { thoughtsTokenCount?: number }) | undefined
    const finishReason = response.candidates?.[0]?.finishReason
    return {
      content: response.text(),
      usage: meta
        ? {
            promptTokens: meta.promptTokenCount || 0,
            completionTokens: meta.candidatesTokenCount || 0,
            thinkingTokens: meta.thoughtsTokenCount || 0,
          }
        : undefined,
      finishReason: finishReason ? String(finishReason) : undefined,
      truncated: String(finishReason) === 'MAX_TOKENS',
    }
  }

  async *stream(messages: LLMMessage[], options?: LLMOptions): AsyncGenerator<LLMStreamChunk> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 8192,
        ...(options?.json && { responseMimeType: 'application/json' }),
      },
    })

    const systemMsg = messages.find((m) => m.role === 'system')
    const nonSystemMsgs = messages.filter((m) => m.role !== 'system')

    const chat = model.startChat({
      ...(systemMsg && {
        systemInstruction: { role: 'user' as const, parts: [{ text: systemMsg.content }] },
      }),
      history: nonSystemMsgs.slice(0, -1).map((m) => ({
        role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
        parts: [{ text: m.content }],
      })),
    })

    const lastMsg = nonSystemMsgs[nonSystemMsgs.length - 1]
    const result = await chat.sendMessageStream(lastMsg!.content)

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        yield { content: text, done: false }
      }
    }
    yield { content: '', done: true }
  }
}
