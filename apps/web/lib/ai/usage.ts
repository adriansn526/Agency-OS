// ─── AI Usage Tracker ───
// Logs token usage and estimates cost per API call

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { costUsd } from './pricing'

export interface UsageEntry {
  timestamp: string
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  /** reasoning tokens, billed as output (older entries do not have this) */
  thinkingTokens?: number
  totalTokens: number
  cost: number        // estimated USD
  action: string      // 'brand_dna' | 'content_generate' | 'test'
  detail?: string     // topic / client name
}

export interface UsageStats {
  totalCalls: number
  totalTokens: number
  totalCost: number
  today: { calls: number; tokens: number; cost: number }
  thisMonth: { calls: number; tokens: number; cost: number }
  entries: UsageEntry[] // last 50
}

function getUsageFilePath(): string {
  const dir = join(process.cwd(), '.data')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'ai-usage.json')
}

function readUsageLog(): UsageEntry[] {
  const path = getUsageFilePath()
  if (!existsSync(path)) return []
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return []
  }
}

function writeUsageLog(entries: UsageEntry[]) {
  // Keep last 500 entries max
  const trimmed = entries.slice(-500)
  writeFileSync(getUsageFilePath(), JSON.stringify(trimmed, null, 2))
}

export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
  thinkingTokens = 0
): number {
  return costUsd(model, { promptTokens, completionTokens, thinkingTokens })
}

export function logUsage(entry: Omit<UsageEntry, 'timestamp' | 'totalTokens' | 'cost'> & { cost?: number }) {
  const entries = readUsageLog()
  const totalTokens = entry.promptTokens + entry.completionTokens + (entry.thinkingTokens ?? 0)
  const cost = entry.cost ?? estimateCost(entry.model, entry.promptTokens, entry.completionTokens, entry.thinkingTokens ?? 0)

  entries.push({
    ...entry,
    timestamp: new Date().toISOString(),
    totalTokens,
    cost,
  })

  writeUsageLog(entries)
}

export function getUsageStats(): UsageStats {
  const entries = readUsageLog()
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const monthStr = now.toISOString().slice(0, 7)

  let totalTokens = 0, totalCost = 0
  let todayCalls = 0, todayTokens = 0, todayCost = 0
  let monthCalls = 0, monthTokens = 0, monthCost = 0

  for (const e of entries) {
    totalTokens += e.totalTokens
    totalCost += e.cost
    if (e.timestamp.startsWith(todayStr)) {
      todayCalls++; todayTokens += e.totalTokens; todayCost += e.cost
    }
    if (e.timestamp.startsWith(monthStr)) {
      monthCalls++; monthTokens += e.totalTokens; monthCost += e.cost
    }
  }

  return {
    totalCalls: entries.length,
    totalTokens,
    totalCost,
    today: { calls: todayCalls, tokens: todayTokens, cost: todayCost },
    thisMonth: { calls: monthCalls, tokens: monthTokens, cost: monthCost },
    entries: entries.slice(-50).reverse(),
  }
}
