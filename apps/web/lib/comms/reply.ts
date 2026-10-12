/** Reply composition for email conversations: recipient, subject, threading headers and the quoted original. Pure, so it is unit-testable. */
export interface ThreadMsg {
  id: string
  externalId: string | null
  threadId: string | null
  direction: string
  subject: string
  body: string
  fromAddr: string | null
  toAddr: string | null
  mailbox: string | null
  createdAt: Date
  userName?: string | null
}

const MAX_REFERENCES = 10

export const addrOf = (s: string | null | undefined): string | null => {
  const m = (s ?? '').match(/<([^<>\s]+@[^<>\s]+)>/) ?? (s ?? '').match(/([^\s,;<>"]+@[^\s,;<>"]+)/)
  return m ? m[1]!.toLowerCase() : null
}

export const replySubject = (s: string): string => (/^\s*(re|răspuns|raspuns)\s*:/i.test(s) ? s.trim() : `Re: ${s.trim() || '(fără subiect)'}`)

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildReply(parent: ThreadMsg, thread: ThreadMsg[]) {
  const to = parent.direction === 'inbound' ? addrOf(parent.fromAddr) : addrOf((parent.toAddr ?? '').split(',')[0])
  const ids = [...thread].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((m) => m.externalId).filter((x): x is string => Boolean(x && x.startsWith('<')))
  if (parent.externalId && !ids.includes(parent.externalId)) ids.push(parent.externalId)
  // root first, then the most recent ones, parent last (RFC 5322 §3.6.4)
  const refs = ids.length > MAX_REFERENCES ? [ids[0]!, ...ids.slice(-(MAX_REFERENCES - 1))] : ids
  const threadId = parent.threadId ?? parent.externalId ?? null
  const when = parent.createdAt.toLocaleString('ro-RO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Bucharest' })
  const who = parent.direction === 'inbound' ? (parent.fromAddr ?? 'expeditor') : (parent.fromAddr ?? 'noi')
  const head = `În ${when}, ${who} a scris:`
  const original = parent.body.trim().slice(0, 4000)
  return {
    to,
    subject: replySubject(parent.subject),
    inReplyTo: parent.externalId && parent.externalId.startsWith('<') ? parent.externalId : undefined,
    references: refs,
    threadId,
    mailbox: parent.mailbox,
    quotedText: `\n\n${head}\n${original.split('\n').map((l) => `> ${l}`).join('\n')}`,
    quotedHtml: `<br><br><div style="color:#666;font-size:12px">${esc(head)}</div><blockquote style="margin:4px 0 0;padding-left:10px;border-left:3px solid #ccc;color:#555;white-space:pre-wrap">${esc(original)}</blockquote>`,
  }
}
