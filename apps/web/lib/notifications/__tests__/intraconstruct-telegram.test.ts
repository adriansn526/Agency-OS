import { test } from 'node:test'
import assert from 'node:assert/strict'
import { esc, sendIntraconstructTelegram, telegramConfig } from '../intraconstruct-telegram'

test('not configured → false, nothing is sent', async () => {
  let called = false
  assert.equal(await sendIntraconstructTelegram('x', { env: {} as any, fetchImpl: (async () => { called = true; return new Response('{}') }) as any }), false)
  assert.equal(called, false); assert.equal(telegramConfig({ INTRACONSTRUCT_TELEGRAM_BOT_TOKEN: 't' } as any), null)
})
test('sends HTML with the dedicated bot token, chat id and a link button', async () => {
  let url = '', body: any
  const ok = await sendIntraconstructTelegram('<b>x</b>', { env: { INTRACONSTRUCT_TELEGRAM_BOT_TOKEN: 'abc', INTRACONSTRUCT_TELEGRAM_CHAT_ID: '7' } as any, button: { text: 'Open', url: 'https://a.b/c' }, fetchImpl: (async (u: any, i: any) => { url = String(u); body = JSON.parse(i.body); return new Response('{}', { status: 200 }) }) as any })
  assert.equal(ok, true); assert.match(url, /\/botabc\/sendMessage$/); assert.deepEqual([body.chat_id, body.parse_mode], ['7', 'HTML']); assert.equal(body.reply_markup.inline_keyboard[0][0].url, 'https://a.b/c')
})
test('Telegram refusing or the network failing returns false instead of throwing', async () => {
  const env = { INTRACONSTRUCT_TELEGRAM_BOT_TOKEN: 'abc', INTRACONSTRUCT_TELEGRAM_CHAT_ID: '7' } as any
  assert.equal(await sendIntraconstructTelegram('x', { env, fetchImpl: (async () => new Response('nope', { status: 400 })) as any }), false)
  assert.equal(await sendIntraconstructTelegram('x', { env, fetchImpl: (async () => { throw new Error('down') }) as any }), false)
})
test('esc neutralises HTML', () => assert.equal(esc('A <b>&</b>'), 'A &lt;b&gt;&amp;&lt;/b&gt;'))
