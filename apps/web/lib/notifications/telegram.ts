/**
 * Shared Telegram notification utility
 * Used by: uptime alerts, negative keyword detection, SEO alerts, etc.
 */

const TELEGRAM_API = 'https://api.telegram.org'

export async function sendTelegramAlert(message: string, parseMode: 'Markdown' | 'HTML' = 'Markdown') {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!botToken || !chatId) {
    console.warn('[Telegram] Not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID missing)')
    return false
  }

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: parseMode,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[Telegram] Send failed:', res.status, err)
      return false
    }

    return true
  } catch (err) {
    console.error('[Telegram] Send error:', err)
    return false
  }
}

/**
 * Send a structured notification with title + sections
 */
export async function sendTelegramNotification(opts: {
  title: string
  emoji?: string
  sections: Array<{ label: string; value: string }>
  footer?: string
}) {
  const lines = [
    `${opts.emoji || '🔔'} *${opts.title}*`,
    '',
    ...opts.sections.map(s => `${s.label}: ${s.value}`),
  ]

  if (opts.footer) {
    lines.push('', opts.footer)
  }

  return sendTelegramAlert(lines.join('\n'))
}
