// ─── AI Copilot — Streaming API Route (Phase 3) ───
// POST /api/ai/copilot
// Accepts { messages, pathname, conversationId? } and streams AI response.
// Phase 3: conversation persistence, action proposals, external tool support.

import { NextRequest } from 'next/server'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { getCopilotSystemPrompt } from '@/lib/ai/copilot/system-prompt'
import { buildCopilotContext } from '@/lib/ai/copilot/context-builder'
import { copilotTools, executeTool } from '@/lib/ai/copilot/tools'
import { logUsage } from '@/lib/ai/usage'
import { createConversation, saveConversation } from '@/lib/ai/copilot/conversation-store'

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
  toolsUsed?: string[]
  actionsPerformed?: { type: string; detail: string }[]
  timestamp?: string
}

interface RequestBody {
  messages: ChatMessage[]
  pathname: string
  conversationId?: string
}

// Convert our tool definitions to Gemini function declarations
function toGeminiFunctionDeclarations() {
  return copilotTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        Object.entries((tool.parameters as Record<string, unknown>).properties as Record<string, unknown> || {}).map(
          ([key, val]) => {
            const v = val as Record<string, unknown>
            const prop: Record<string, unknown> = {
              type: v.type === 'number' ? SchemaType.NUMBER : SchemaType.STRING,
              description: v.description as string,
            }
            if (v.enum) {
              prop.enum = v.enum
            }
            return [key, prop]
          }
        )
      ),
    },
  }))
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    const { messages, pathname } = body
    let { conversationId } = body

    if (!messages || messages.length === 0) {
      return Response.json({ error: 'No messages provided' }, { status: 400 })
    }

    // Get API key
    let apiKey = process.env.GOOGLE_API_KEY || ''
    try {
      const { readFileSync, existsSync } = await import('fs')
      const { join } = await import('path')
      const settingsFile = join(process.cwd(), '.data', 'settings.json')
      if (existsSync(settingsFile)) {
        const settings = JSON.parse(readFileSync(settingsFile, 'utf-8'))
        if (settings.integrations?.ai?.apiKey) {
          apiKey = settings.integrations.ai.apiKey
        }
      }
    } catch { /* use env var */ }

    if (!apiKey) {
      return Response.json({ error: 'AI not configured — add API key in Settings' }, { status: 500 })
    }

    // Create or reuse conversation
    if (!conversationId) {
      const firstUserMsg = messages.find((m) => m.role === 'user')
      conversationId = await createConversation(
        firstUserMsg?.content || 'Conversație nouă',
        pathname
      )
    }

    // Build context-aware system prompt (async — queries live DB)
    const pageContext = await buildCopilotContext(pathname || '/')
    const systemPrompt = getCopilotSystemPrompt(pageContext)

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations: toGeminiFunctionDeclarations() as any }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    })

    // Convert messages to Gemini format
    const geminiHistory = messages.slice(0, -1).map((m) => ({
      role: m.role === 'ai' ? 'model' as const : 'user' as const,
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1]!
    const chat = model.startChat({ history: geminiHistory })

    // Track tools used and actions for conversation save
    const usedTools: string[] = []
    const performedActions: { type: string; detail: string }[] = []
    let aiResponseText = ''

    // Capture conversationId for closure
    const convId = conversationId

    // Stream response with tool calling loop
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessage = lastMessage.content
          let maxToolCalls = 8 // Increased for multi-source reports

          // Send conversationId to client
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'meta', conversationId: convId })}\n\n`)
          )

          while (maxToolCalls > 0) {
            const result = await chat.sendMessageStream(currentMessage)
            let functionCalls: Array<{ name: string; args: Record<string, unknown> }> = []

            for await (const chunk of result.stream) {
              const candidates = chunk.candidates
              if (candidates?.[0]?.content?.parts) {
                for (const part of candidates[0].content.parts) {
                  if (part.functionCall) {
                    functionCalls.push({
                      name: part.functionCall.name,
                      args: (part.functionCall.args || {}) as Record<string, unknown>,
                    })
                  }
                  if (part.text) {
                    aiResponseText += part.text
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'text', content: part.text })}\n\n`)
                    )
                  }
                }
              }
            }

            // If there are function calls, execute them and send results back
            if (functionCalls.length > 0) {
              maxToolCalls--

              const functionResponses = []
              for (const fc of functionCalls) {
                usedTools.push(fc.name)
                const toolResult = await executeTool(fc.name, fc.args, convId)

                // Check for special actions in tool result
                try {
                  const parsed = JSON.parse(toolResult)

                  // Navigation action
                  if (parsed.__action === 'navigate') {
                    performedActions.push({ type: 'navigate', detail: parsed.path })
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: 'action',
                          action: 'navigate',
                          path: parsed.path,
                          reason: parsed.reason,
                        })}\n\n`
                      )
                    )
                  }

                  // Action proposal (approval-based write ops)
                  if (parsed.__action === 'propose') {
                    performedActions.push({ type: 'propose', detail: `${parsed.actionType}:${parsed.actionId}` })
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({
                          type: 'action_proposal',
                          actionId: parsed.actionId,
                          actionType: parsed.actionType,
                          payload: parsed.payload,
                          reasoning: parsed.reasoning,
                          message: parsed.message,
                        })}\n\n`
                      )
                    )
                  }
                } catch { /* not JSON or not an action */ }

                // Notify client about tool usage
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ type: 'tool', name: fc.name, args: fc.args })}\n\n`
                  )
                )

                functionResponses.push({
                  functionResponse: {
                    name: fc.name,
                    response: { result: toolResult },
                  },
                })
              }

              // Send function results back to model
              currentMessage = ''
              const toolResultStream = await chat.sendMessageStream(functionResponses as never)

              let hasNewFunctionCalls = false
              functionCalls = []

              for await (const chunk of toolResultStream.stream) {
                const candidates = chunk.candidates
                if (candidates?.[0]?.content?.parts) {
                  for (const part of candidates[0].content.parts) {
                    if (part.functionCall) {
                      hasNewFunctionCalls = true
                      functionCalls.push({
                        name: part.functionCall.name,
                        args: (part.functionCall.args || {}) as Record<string, unknown>,
                      })
                    }
                    if (part.text) {
                      aiResponseText += part.text
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: 'text', content: part.text })}\n\n`)
                      )
                    }
                  }
                }
              }

              if (hasNewFunctionCalls && functionCalls.length > 0) {
                continue
              }

              break
            }

            break
          }

          // Log usage
          logUsage({
            provider: 'gemini',
            model: 'gemini-2.5-flash',
            promptTokens: 0,
            completionTokens: 0,
            action: 'copilot_chat',
            detail: pathname,
          })

          // Save conversation to DB (async — don't block response)
          const storedMessages = [
            ...messages.map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp || new Date().toISOString(),
            })),
            {
              role: 'ai' as const,
              content: aiResponseText,
              toolsUsed: usedTools,
              actionsPerformed: performedActions,
              timestamp: new Date().toISOString(),
            },
          ]
          saveConversation(convId, storedMessages, pathname).catch((err) => {
            console.error('[Copilot] Failed to save conversation:', err)
          })

          // Send done signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          controller.close()
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error'
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', content: `Eroare AI: ${errorMsg}` })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
