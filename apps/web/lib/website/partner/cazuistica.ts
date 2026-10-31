/**
 * A "cazuistică" entry (an anonymised special case) is a title plus content blocks, stored as one JSON string in the doctor's `cazuistica` list:
 * {"v":2,"t":"Titlu","b":[{"k":"p","x":"…"}, …]}. Older entries are plain "Titlu | Descriere" strings and stay valid.
 *
 * Blocks: p (paragraph), long (several paragraphs / "- " lists), h1, h2, ul, ol, img, gal (gallery), vid (YouTube or Vimeo link).
 * Images and uploaded videos must be ones the doctor uploaded to their own profile (so a case cannot point at arbitrary addresses); other videos only come
 * from YouTube or Vimeo. Everything is checked here, and the team still reads each proposal before it shows.
 */
import { z } from 'zod'

export const CASE_IMAGE_ALT = 'cazuistica'
const MAX_CASE_CHARS = 24_000

const YT = /^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/
const VIMEO = /^https?:\/\/(?:www\.)?vimeo\.com\/(?:video\/)?(\d{6,12})(?:[?#/].*)?$/

/** The canonical link of a YouTube or Vimeo video, or null. */
export function normalizeVideoUrl(raw: string): string | null {
  const s = raw.trim()
  const y = YT.exec(s); if (y) return `https://www.youtube.com/watch?v=${y[1]}`
  const v = VIMEO.exec(s); if (v) return `https://vimeo.com/${v[1]}`
  return null
}

const t = (max: number) => z.string().trim().min(1).max(max)
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined)
const image = z.object({ u: z.string().trim().url().max(500), a: opt(200) }).strict()
/** A YouTube/Vimeo link (made canonical) or the address of a video the doctor uploaded (checked against their own uploads in updateProfile). */
const video = z.string().trim().url().max(500).transform((v) => normalizeVideoUrl(v) ?? v)

const block = z.union([
  z.object({ k: z.literal('p'), x: t(2000) }).strict(),
  z.object({ k: z.literal('long'), x: t(8000) }).strict(),
  z.object({ k: z.literal('h1'), x: t(150) }).strict(),
  z.object({ k: z.literal('h2'), x: t(150) }).strict(),
  z.object({ k: z.literal('ul'), i: z.array(t(300)).min(1).max(20) }).strict(),
  z.object({ k: z.literal('ol'), i: z.array(t(300)).min(1).max(20) }).strict(),
  z.object({ k: z.literal('img'), u: z.string().trim().url().max(500), a: opt(200), c: opt(200) }).strict(),
  z.object({ k: z.literal('gal'), g: z.array(image).min(2).max(8), c: opt(200) }).strict(),
  z.object({ k: z.literal('vid'), u: video, p: opt(500), c: opt(200) }).strict(),
])

export const caseV2 = z.object({ v: z.literal(2), t: z.string().trim().min(3).max(120), b: z.array(block).min(1).max(40) }).strict()
export type Case = z.infer<typeof caseV2>
export type Block = Case['b'][number]

const words = (b: Block) => ('x' in b ? b.x.length : 'i' in b ? b.i.join(' ').length : 0)

function legacy(s: string): string | null {
  const i = s.indexOf('|')
  return i > 2 && i <= 120 && s.slice(i + 1).trim().length >= 20 ? s : null
}

/** Validates one list entry and returns it in canonical form (videos normalised), or the first problem. */
export function canonicalCase(raw: string): { ok: true; value: string; case: Case | null } | { ok: false; message: string } {
  const s = raw.trim()
  if (s.length > MAX_CASE_CHARS) return { ok: false, message: 'Cazul este prea lung' }
  if (!s.startsWith('{')) {
    return legacy(s) ? { ok: true, value: s, case: null } : { ok: false, message: 'Format: Titlu (max. 120 caractere) | Descriere (min. 20 caractere)' }
  }
  let json: unknown
  try { json = JSON.parse(s) } catch { return { ok: false, message: 'Caz invalid' } }
  const r = caseV2.safeParse(json)
  if (!r.success) return { ok: false, message: `Caz invalid: ${r.error.issues[0]?.message ?? 'format'}` }
  if (r.data.b.reduce((n, b) => n + words(b), 0) < 20) return { ok: false, message: 'Adaugă un text de cel puțin 20 de caractere' }
  return { ok: true, value: JSON.stringify(r.data), case: r.data }
}

/** Addresses of uploaded videos (and their posters): any video that is not a YouTube/Vimeo link. */
export function caseVideoFiles(c: Case | null): string[] {
  if (!c) return []
  return c.b.flatMap((b) => (b.k === 'vid' && !normalizeVideoUrl(b.u) ? [b.u, ...(b.p ? [b.p] : [])] : []))
}

/** Every image address a case uses. */
export function caseImageUrls(c: Case | null): string[] {
  if (!c) return []
  return c.b.flatMap((b) => (b.k === 'img' ? [b.u] : b.k === 'gal' ? b.g.map((x) => x.u) : []))
}

/** Image and uploaded-video addresses used by the entries of a `cazuistica` list (live or proposed). */
export function urlsInList(list: unknown): string[] {
  if (!Array.isArray(list)) return []
  return list.flatMap((s) => { const r = typeof s === 'string' ? canonicalCase(s) : null; return r?.ok ? [...caseImageUrls(r.case), ...caseVideoFiles(r.case)] : [] })
}
