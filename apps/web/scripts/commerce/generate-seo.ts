/**
 * SEO titles / descriptions / slugs for the storefront listings. READ-ONLY: writes a preview CSV and prints statistics.
 *   npx tsx --env-file=.env.local scripts/commerce/generate-seo.ts [--sample=40]
 * (Applying the titles/slugs is a separate, explicit step.)
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { db } from '@repo/db'
import { loadSeoRows } from '../../lib/commerce/seo/data'
import { buildSeo, disambiguate, TITLE_MAX } from '../../lib/commerce/seo/titles'

const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

async function main() {
  const bl = await db.businessLine.findUnique({ where: { slug: 'ecaroseria' }, select: { id: true } })
  if (!bl) throw new Error('business line not found')
  const rows = await loadSeoRows({ businessLineId: bl.id })
  const built = rows.map((r) => ({ r, s: buildSeo(r) }))
  const finalTitles = disambiguate(built.map(({ s }) => s.title), built.map(({ r }) => r.oeMain))
  const out = built.map(({ r, s }, i) => ({ r, s: { ...s, title: finalTitles[i]! } }))

  const dir = path.join(os.homedir(), 'data', 'ecaroseria-feed', 'reports'); fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `seo-preview-${new Date().toISOString().slice(0, 10)}.csv`)
  fs.writeFileSync(file, '﻿' + 'SKU,Denumire,Vehicule (nr modele),Titlu,Lungime,Nivel,Trunchiat,Slug curent,Slug propus,Descriere\n' +
    out.map(({ r, s }) => [r.sku, r.nameRo, s.modelCount, s.title, s.title.length, s.level, s.truncated ? 'da' : '', r.currentSlug, s.slug, s.description].map(cell).join(',')).join('\n') + '\n')

  const titleCount = new Map<string, number>(), slugCount = new Map<string, number>()
  for (const { s } of out) { titleCount.set(s.title, (titleCount.get(s.title) ?? 0) + 1); slugCount.set(s.slug, (slugCount.get(s.slug) ?? 0) + 1) }
  const dupTitles = [...titleCount.values()].filter((n) => n > 1)
  const levels = [0, 1, 2, 3, 4].map((l) => out.filter(({ s }) => s.level === l).length)
  const over = out.filter(({ s }) => s.title.length > TITLE_MAX).length
  const lens = out.map(({ s }) => s.title.length).sort((a, b) => a - b)
  const stats = {
    listings: out.length,
    withVehicle: out.filter(({ s }) => s.hasVehicle).length,
    noVehicle: out.filter(({ s }) => !s.hasVehicle).length,
    levelCounts: { 'cu ani': levels[0], 'fără ani': levels[1], 'primul vehicul': levels[2], 'doar marca': levels[3], 'doar numele': levels[4] },
    truncated: out.filter(({ s }) => s.truncated).length,
    titleOverLimit: over,
    titleLength: { median: lens[Math.floor(lens.length / 2)], p95: lens[Math.floor(lens.length * 0.95)], max: lens[lens.length - 1] },
    titlesUsedByMoreThanOneProduct: dupTitles.length, productsSharingATitle: dupTitles.reduce((a, b) => a + b, 0),
    slugCollisions: [...slugCount.values()].filter((n) => n > 1).length,
    slugMaxLength: Math.max(...out.map(({ s }) => s.slug.length)),
    slugsAlreadyEqual: out.filter(({ r, s }) => r.currentSlug === s.slug).length,
    existingSeoTitles: out.filter(({ r }) => r.currentSeoTitle).length,
    csv: file,
  }
  console.log(JSON.stringify(stats, null, 2))
  const n = Number((process.argv.find((a) => a.startsWith('--sample=')) ?? '--sample=0').split('=')[1])
  for (let i = 0; i < n; i++) { const { r, s } = out[Math.floor(Math.random() * out.length)]!; console.log(`\n${r.sku}  [${r.nameRo}]  ${s.modelCount} modele, nivel ${s.level}\n  titlu: ${s.title}\n  slug:  ${s.slug}\n  descr: ${s.description}`) }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
