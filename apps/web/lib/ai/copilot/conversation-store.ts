// ─── AI Copilot — Conversation Store (Phase 3) ───
// CRUD operations for persistent conversation history in PostgreSQL.

import { db } from '@repo/db'

interface StoredMessage {
  role: 'user' | 'ai'
  content: string
  toolsUsed?: string[]
  actionsPerformed?: { type: string; detail: string }[]
  timestamp: string
}

export interface ConversationSummary {
  id: string
  title: string | null
  messageCount: number
  pathname: string | null
  updatedAt: string
}

/**
 * Create a new conversation
 */
export async function createConversation(firstMessage: string, pathname?: string): Promise<string> {
  const title = generateTitle(firstMessage)

  const conv = await db.copilotConversation.create({
    data: {
      title,
      messages: [],
      pathname: pathname || null,
    },
  })

  return conv.id
}

/**
 * Save messages to an existing conversation
 */
export async function saveConversation(
  id: string,
  messages: StoredMessage[],
  pathname?: string,
  tokenCount?: number,
  cost?: number
): Promise<void> {
  const data: Record<string, unknown> = {
    messages: messages as unknown as any,
  }
  if (pathname) data.pathname = pathname
  if (tokenCount !== undefined) data.tokenCount = tokenCount
  if (cost !== undefined) data.cost = cost

  // Auto-update title from first user message if not set
  const existing = await db.copilotConversation.findUnique({
    where: { id },
    select: { title: true },
  })
  if (!existing?.title && messages.length > 0) {
    const firstUserMsg = messages.find((m) => m.role === 'user')
    if (firstUserMsg) {
      data.title = generateTitle(firstUserMsg.content)
    }
  }

  await db.copilotConversation.update({
    where: { id },
    data,
  })
}

/**
 * Load a conversation by ID
 */
export async function loadConversation(id: string): Promise<{
  id: string
  title: string | null
  messages: StoredMessage[]
  pathname: string | null
} | null> {
  const conv = await db.copilotConversation.findUnique({
    where: { id },
    select: { id: true, title: true, messages: true, pathname: true },
  })

  if (!conv) return null

  return {
    id: conv.id,
    title: conv.title,
    messages: (conv.messages as unknown as StoredMessage[]) || [],
    pathname: conv.pathname,
  }
}

/**
 * List recent conversations (most recent first)
 */
export async function listConversations(limit = 20): Promise<ConversationSummary[]> {
  const conversations = await db.copilotConversation.findMany({
    select: {
      id: true,
      title: true,
      messages: true,
      pathname: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })

  return conversations.map((c) => ({
    id: c.id,
    title: c.title,
    messageCount: Array.isArray(c.messages) ? (c.messages as unknown[]).length : 0,
    pathname: c.pathname,
    updatedAt: c.updatedAt.toISOString(),
  }))
}

/**
 * Delete a conversation (cascades to actions)
 */
export async function deleteConversation(id: string): Promise<void> {
  await db.copilotConversation.delete({ where: { id } })
}

/**
 * Auto-generate a short title from the first user message
 */
function generateTitle(message: string): string {
  // Truncate to ~50 chars, clean up
  const cleaned = message.replace(/\n/g, ' ').trim()
  if (cleaned.length <= 50) return cleaned
  return cleaned.slice(0, 47) + '...'
}
