/**
 * Setup helper for the IntraConstruct Telegram bot.
 *   npx tsx scripts/intraconstruct-telegram.ts chat-id   # after sending /start to the bot: prints the chat id(s) that wrote to it
 *   npx tsx scripts/intraconstruct-telegram.ts test      # sends a test message with the configured token and chat id
 * Token / chat id come from INTRACONSTRUCT_TELEGRAM_BOT_TOKEN / INTRACONSTRUCT_TELEGRAM_CHAT_ID (apps/web/.env.local).
 */
import { sendIntraconstructTelegram, telegramConfig } from '../lib/notifications/intraconstruct-telegram'

async function main() {
  const cmd = process.argv[2]
  if (cmd === 'chat-id') {
    const token = process.env.INTRACONSTRUCT_TELEGRAM_BOT_TOKEN
    if (!token) throw new Error('INTRACONSTRUCT_TELEGRAM_BOT_TOKEN lipsește')
    const j = (await (await fetch(`https://api.telegram.org/bot${token}/getUpdates`)).json()) as { ok: boolean; result?: { message?: { chat: { id: number; type: string; first_name?: string; title?: string } } }[]; description?: string }
    if (!j.ok) throw new Error(j.description ?? 'getUpdates a eșuat')
    const chats = new Map<number, string>()
    for (const u of j.result ?? []) if (u.message) chats.set(u.message.chat.id, `${u.message.chat.type} ${u.message.chat.first_name ?? u.message.chat.title ?? ''}`.trim())
    if (!chats.size) console.log('Niciun mesaj primit. Deschide botul în Telegram, apasă Start (sau scrie-i ceva) și rulează din nou.')
    for (const [id, who] of chats) console.log(`INTRACONSTRUCT_TELEGRAM_CHAT_ID=${id}   # ${who}`)
  } else if (cmd === 'test') {
    if (!telegramConfig()) throw new Error('Configurează INTRACONSTRUCT_TELEGRAM_BOT_TOKEN și INTRACONSTRUCT_TELEGRAM_CHAT_ID')
    console.log((await sendIntraconstructTelegram('✅ <b>IntraConstruct</b>: botul de notificări funcționează.')) ? 'Trimis.' : 'Nu a mers (vezi eroarea de mai sus).')
  } else console.log('Folosire: chat-id | test')
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
