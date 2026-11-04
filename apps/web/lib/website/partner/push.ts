/**
 * Push notifications for partners (Expo push service): the mobile app registers its token, and a new quote request is pushed to the
 * devices of every firm it reaches. A token belongs to one firm at a time (a different firm logging in on the same phone takes it over).
 */
import { db } from '@repo/db'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/
const BATCH = 100

export const isExpoToken = (v: unknown): v is string => typeof v === 'string' && EXPO_TOKEN_RE.test(v)

export interface PushMessage { title: string; body: string; data?: Record<string, unknown> }
export interface ExpoMessage extends PushMessage { to: string; sound: 'default' }

export const buildMessages = (tokens: string[], m: PushMessage): ExpoMessage[] =>
  [...new Set(tokens.filter(isExpoToken))].map((to) => ({ to, sound: 'default', title: m.title, body: m.body, ...(m.data ? { data: m.data } : {}) }))

export async function registerDevice(entryId: string, token: string, now = new Date()) {
  await db.websitePartnerDevice.upsert({ where: { token }, create: { entryId, token }, update: { entryId, lastSeenAt: now } })
}

export async function removeDevice(entryId: string, token: string) {
  await db.websitePartnerDevice.deleteMany({ where: { entryId, token } })
}

type Ticket = { status?: string; details?: { error?: string } }

/** Sends to every device of the given firms; tokens Expo reports as unregistered are deleted. Never throws (push is best effort). */
export async function pushToEntries(entryIds: string[], m: PushMessage | ((entryId: string) => PushMessage)): Promise<{ sent: number }> {
  try {
    if (!entryIds.length) return { sent: 0 }
    const devices = await db.websitePartnerDevice.findMany({ where: { entryId: { in: entryIds } }, select: { entryId: true, token: true } })
    const messages = devices.flatMap((d) => buildMessages([d.token], typeof m === 'function' ? m(d.entryId) : m))
    const dead: string[] = []
    for (let i = 0; i < messages.length; i += BATCH) {
      const chunk = messages.slice(i, i + BATCH)
      const res = await fetch(EXPO_PUSH_URL, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(chunk), signal: AbortSignal.timeout(10_000) })
      const tickets = ((await res.json().catch(() => ({}))) as { data?: Ticket[] }).data ?? []
      tickets.forEach((t, idx) => { if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') dead.push(chunk[idx].to) })
    }
    if (dead.length) await db.websitePartnerDevice.deleteMany({ where: { token: { in: dead } } })
    return { sent: messages.length - dead.length }
  } catch (e) {
    console.error('[partner-push]', e instanceof Error ? e.message : e)
    return { sent: 0 }
  }
}
