/**
 * Telegram notifications of the IntraConstruct line, sent by its own bot (INTRACONSTRUCT_TELEGRAM_BOT_TOKEN / INTRACONSTRUCT_TELEGRAM_CHAT_ID),
 * separate from the general alerts bot. Best effort: never throws, returns false when not configured or when Telegram refuses.
 */
const API = 'https://api.telegram.org'

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
export const appUrl = () => (process.env.APP_PUBLIC_URL || process.env.NEXTAUTH_URL || 'https://admin.asns.ro').replace(/\/$/, '')
export const leadUrl = (leadId: string) => `${appUrl()}/crm/lead-uri/${leadId}`

export function telegramConfig(env: NodeJS.ProcessEnv = process.env) {
  const token = env.INTRACONSTRUCT_TELEGRAM_BOT_TOKEN?.trim(), chatId = env.INTRACONSTRUCT_TELEGRAM_CHAT_ID?.trim()
  return token && chatId ? { token, chatId } : null
}

export async function sendIntraconstructTelegram(html: string, o: { button?: { text: string; url: string }; fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv } = {}): Promise<boolean> {
  const c = telegramConfig(o.env)
  if (!c) return false
  try {
    const res = await (o.fetchImpl ?? fetch)(`${API}/bot${c.token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
      body: JSON.stringify({ chat_id: c.chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true, ...(o.button ? { reply_markup: { inline_keyboard: [[{ text: o.button.text, url: o.button.url }]] } } : {}) }),
    })
    if (!res.ok) console.error('[telegram:intraconstruct] send failed', res.status, (await res.text()).slice(0, 200))
    return res.ok
  } catch (e) {
    console.error('[telegram:intraconstruct]', e instanceof Error ? e.message : e)
    return false
  }
}
