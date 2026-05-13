import { NextRequest, NextResponse } from 'next/server'
import { generateText, streamText } from '@/lib/ai/client'
import { buildContentPrompt, type ContentType } from '@/lib/ai/prompts/seo-content'
import type { BrandDNA } from '@/lib/ai/brand-dna/types'

// ─── POST /api/ai/generate ───
// Generate AI content with Brand DNA context
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, topic, brand, platform, language, tone, maxLength, stream } = body as {
      type: ContentType
      topic: string
      brand?: Partial<BrandDNA>
      platform?: string
      language?: string
      tone?: string
      maxLength?: number
      stream?: boolean
    }

    if (!type || !topic) {
      return NextResponse.json({ error: 'type and topic are required' }, { status: 400 })
    }

    const prompt = buildContentPrompt({
      type,
      topic,
      brand,
      platform,
      language,
      tone,
      maxLength,
    })

    // Non-streaming response
    if (!stream) {
      const content = await generateText(
        [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        {
          temperature: prompt.temperature,
          maxTokens: prompt.maxTokens,
        }
      )

      return NextResponse.json({ data: { content, type, topic } })
    }

    // Streaming response
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const generator = streamText(
            [
              { role: 'system', content: prompt.system },
              { role: 'user', content: prompt.user },
            ],
            {
              temperature: prompt.temperature,
              maxTokens: prompt.maxTokens,
            }
          )

          for await (const chunk of generator) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
            )
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Stream error'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[API] POST /api/ai/generate error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Content generation failed: ${message}` }, { status: 500 })
  }
}
