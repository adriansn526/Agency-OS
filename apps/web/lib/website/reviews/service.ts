/**
 * Doctors review the health-education articles ("afecțiuni") of their own specialty.
 *
 * A confirmed review puts the doctor's name, specialty and a link to the profile on the public article ("Revizuit medical de …"); it is stored
 * as `slug|AAAA-LL-ZZ` in the article's `revizuiri` list, and the site resolves the name from the profile (so an unpublished doctor shows nowhere).
 * A doctor can also send suggested changes: they wait in `sugestii_medici` (internal, never public) for the team. Nothing here publishes an article:
 * the team does, after reading the confirmation. Only published doctors with a valid CMR verification and the article's specialty can review.
 */
import { z } from 'zod'
import { db, Prisma } from '@repo/db'
import { AdminError } from '../admin/errors'
import { activeCmr, CMR_KEY, decodeCmr } from '../verification/cmr-data'

export const REVIEWS_KEY = 'revizuiri'
export const SUGGESTIONS_KEY = 'sugestii_medici'
const MAX_REVIEWS = 10, MAX_SUGGESTIONS = 30

export const suggestionInput = z.object({ action: z.literal('suggest'), note: z.string().trim().min(10, 'Descrie pe scurt ce ar trebui schimbat').max(1500) })
const action = z.union([z.object({ action: z.literal('confirm') }), z.object({ action: z.literal('withdraw') }), suggestionInput])

type Doctor = { id: string; businessLineId: string; title: string }
type Data = Record<string, unknown>
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const day = (d: Date) => d.toISOString().slice(0, 10)

export const parseReviews = (v: unknown) => list(v).map((s) => { const [slug = '', date = ''] = s.split('|'); return { slug: slug.trim(), date: date.trim() } }).filter((r) => r.slug && /^\d{4}-\d{2}-\d{2}$/.test(r.date))

const NOT_PUBLISHED = 'Profilul tău trebuie să fie publicat ca să poți revizui articole'
const NOT_VERIFIED = 'Poți confirma revizuirea după ce echipa a verificat dreptul tău de practică în Registrul CMR'

/** Why this doctor cannot confirm yet (null = can). Reading the articles of their specialty never needs it. */
function blocker(me: { status: string; data: unknown }, now: Date): string | null {
  if (me.status !== 'published') return NOT_PUBLISHED
  if (!activeCmr(decodeCmr((me.data as Data | null)?.[CMR_KEY]), now).length) return NOT_VERIFIED
  return null
}

async function loadMe(doc: Doctor) {
  const me = await db.websiteEntry.findUnique({ where: { id: doc.id }, select: { id: true, slug: true, title: true, status: true, businessLineId: true, data: true } })
  if (!me) throw new AdminError('Profilul nu există', 404)
  return me
}

async function reviewer(doc: Doctor, now: Date) {
  const me = await loadMe(doc)
  const why = blocker(me, now)
  if (why) throw new AdminError(why, 403)
  return me
}

/** The article's specialty (or one of its related procedures) is one the doctor lists. */
export function sameField(doctorData: unknown, article: Data) {
  const mine = new Set(list((doctorData as Data | null)?.servicii))
  return [article.parinte, ...list(article.proceduri_legate)].some((s) => typeof s === 'string' && mine.has(s))
}

async function articles(lineId: string) {
  return db.websiteEntry.findMany({
    where: { businessLineId: lineId, collection: { key: 'servicii' }, status: { in: ['draft', 'preview', 'published'] }, data: { path: ['tip'], equals: 'situatie' } },
    orderBy: { title: 'asc' }, take: 200,
    select: { id: true, slug: true, title: true, summary: true, body: true, status: true, data: true },
  })
}

/** Every logged-in doctor reads the articles of their specialty; `canReview`/`reason` tell whether confirming, suggesting and withdrawing are open to them yet. */
export async function listArticles(doc: Doctor, now = new Date()) {
  const me = await loadMe(doc)
  const reason = blocker(me, now)
  const rows = (await articles(me.businessLineId)).filter((a) => sameField(me.data, a.data as Data))
  const slugs = [...new Set(rows.flatMap((a) => parseReviews((a.data as Data)[REVIEWS_KEY]).map((r) => r.slug)))]
  const names = new Map((await db.websiteEntry.findMany({ where: { businessLineId: me.businessLineId, slug: { in: slugs } }, select: { slug: true, title: true } })).map((e) => [e.slug, e.title]))
  const items = rows.map((a) => {
    const d = a.data as Data
    const reviews = parseReviews(d[REVIEWS_KEY])
    return {
      id: a.id, slug: a.slug, title: a.title, status: a.status, summary: a.summary, body: a.body,
      simptome: list(d.simptome), semne_alarma: list(d.semne_alarma), tratament: list(d.tratament), intrebari: list(d.intrebari),
      reviews: reviews.filter((r) => r.slug !== me.slug).map((r) => ({ title: names.get(r.slug) ?? null, date: r.date })),
      mine: reviews.find((r) => r.slug === me.slug)?.date ?? null,
    }
  })
  return { items, canReview: reason === null, reason }
}

/** confirm | withdraw | suggest on one article; the article's data is changed under a row lock so two doctors answering at once do not overwrite each other. */
export async function answerArticle(doc: Doctor, articleId: string, raw: unknown, now = new Date()) {
  const input = action.parse(raw)
  const me = await reviewer(doc, now)
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "WebsiteEntry" WHERE id = ${articleId} FOR UPDATE`
    const a = await tx.websiteEntry.findFirst({ where: { id: articleId, businessLineId: me.businessLineId, collection: { key: 'servicii' } }, select: { id: true, title: true, status: true, data: true } })
    const d = { ...((a?.data ?? {}) as Data) }
    if (!a || d.tip !== 'situatie' || !['draft', 'preview', 'published'].includes(a.status) || !sameField(me.data, d)) throw new AdminError('Articolul nu există sau nu este din specialitatea ta', 404)
    const reviews = parseReviews(d[REVIEWS_KEY])
    const audit = (what: string, details: Data = {}) => tx.activity.create({ data: { businessLineId: me.businessLineId, userName: me.title, action: what, entityType: 'website_entry', entityId: a.id, entityName: a.title, details: { doctor: me.slug, ...details } as Prisma.InputJsonValue } })

    if (input.action === 'suggest') {
      const rows = list(d[SUGGESTIONS_KEY])
      rows.push(`${me.slug}|${day(now)}|${input.note.replace(/\s+/g, ' ')}`)
      d[SUGGESTIONS_KEY] = rows.slice(-MAX_SUGGESTIONS)
      await tx.websiteEntry.update({ where: { id: a.id }, data: { data: d as Prisma.InputJsonValue } })
      await audit('article_review_suggestion')
      return { status: 'suggested' as const }
    }
    const others = reviews.filter((r) => r.slug !== me.slug)
    if (input.action === 'withdraw') {
      d[REVIEWS_KEY] = others.map((r) => `${r.slug}|${r.date}`)
      await tx.websiteEntry.update({ where: { id: a.id }, data: { data: d as Prisma.InputJsonValue } })
      await audit('article_review_withdrawn')
      return { status: 'withdrawn' as const }
    }
    d[REVIEWS_KEY] = [...others, { slug: me.slug, date: day(now) }].sort((x, y) => x.date.localeCompare(y.date)).slice(-MAX_REVIEWS).map((r) => `${r.slug}|${r.date}`)
    await tx.websiteEntry.update({ where: { id: a.id }, data: { data: d as Prisma.InputJsonValue } })
    await audit('article_review_confirmed', { first: reviews.length === 0 })
    return { status: 'confirmed' as const }
  })
}
