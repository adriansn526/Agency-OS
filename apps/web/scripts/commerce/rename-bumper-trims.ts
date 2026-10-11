/**
 * Renames bumper moulding/trim products that were translated as bumpers ("Bară spate bandă ornamentală (M-SPORT)")
 * to "Bandă ornamentală bară spate (M-SPORT)". Only products whose ENGLISH name says the product itself is the moulding
 * (FRONT|REAR BUMPER [MIDDLE|LOWER|UPPER|SIDE|3/5D…] MOULD[ING] before any parenthesis or "W/") are touched; real bumpers
 * "with moulding holes" are left alone.
 *   npx tsx --env-file=.env.local scripts/commerce/rename-bumper-trims.ts            (dry run + CSV of old -> new)
 *   npx tsx --env-file=.env.local scripts/commerce/rename-bumper-trims.ts --apply
 * Sets nameRoSource='manual' (so the translation job never overwrites) and updates the matching translation rows.
 */
import fs from 'fs'
import os from 'os'
import path from 'path'
import { db } from '@repo/db'

const EN_RE = /^(FRONT|REAR) BUMPER( (MIDDLE|LOWER|UPPER|SIDE|CENTER|CENTRAL|CHROME|CHROMED|BLACK|SILVER|[0-9/]+D))* MOULD(ING)?([ .]|$)/
const RO_RE = /^Bar[ăa] (față|fata|spate)(.*?)\s+(band[ăa](?: (?:ornamental[ăa]|argintie|neagr[ăa]|grunduit[ăa]|cromat[ăa]))?)(.*)$/i
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function renameTrim(en: string, ro: string): string | null {
  const left = en.toUpperCase().split('(')[0]!.trim()
  if (!EN_RE.test(left) || / W\/| WITH /.test(' ' + left + ' ')) return null
  const m = RO_RE.exec(ro)
  if (!m) return null
  const [, side, mid, band, rest] = m
  return `${cap(band!)} bară ${side}${mid ?? ''}${rest ?? ''}`.replace(/\s+/g, ' ').trim()
}

async function main() {
  const apply = process.argv.includes('--apply')
  const rows = await db.$queryRaw<Array<{ id: string; sku: string; en: string; ro: string }>>`
    SELECT id, "supplierCode" AS sku, "nameEn" AS en, "nameRo" AS ro FROM "CommerceProduct"
    WHERE "isActive" AND "nameRo" ~* '^bar[ăa] (fa[țt][ăa]|spate)' AND "nameRo" ~* 'band[ăa]'`
  const changes = rows.map((r) => ({ ...r, next: renameTrim(r.en, r.ro) })).filter((r) => r.next && r.next !== r.ro) as Array<(typeof rows)[number] & { next: string }>
  const skipped = rows.filter((r) => !changes.some((c) => c.id === r.id))
  const dir = path.join(os.homedir(), 'data', 'ecaroseria-feed', 'reports'); fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `redenumire-bandouri-${apply ? 'aplicata' : 'previzualizare'}-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`)
  const cell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  fs.writeFileSync(file, '﻿' + 'SKU,Denumire EN,Denumire RO veche,Denumire RO nouă\n' + changes.map((c) => [c.sku, c.en, c.ro, c.next].map(cell).join(',')).join('\n') + '\n')
  console.log(JSON.stringify({ mode: apply ? 'SCRIERE' : 'dry-run', candidatiBarăCuBandă: rows.length, deRedenumit: changes.length, neatinse: skipped.length, csv: file }, null, 1))
  console.log('\nExemple (înainte → după):'); for (const c of changes.slice(0, 14)) console.log(`  ${c.ro.slice(0, 46).padEnd(46)} → ${c.next}`)
  console.log('\nNeatinse (bare reale), 6 exemple:'); for (const r of skipped.slice(0, 6)) console.log(`  ${r.en.slice(0, 40).padEnd(40)} | ${r.ro.slice(0, 50)}`)
  if (!apply) return
  const ids = changes.map((c) => c.id), names = changes.map((c) => c.next)
  await db.$transaction(async (tx) => {
    const n = await tx.$executeRaw`UPDATE "CommerceProduct" p SET "nameRo" = u.n, "nameRoSource" = 'manual', "updatedAt" = now() FROM unnest(${ids}::text[], ${names}::text[]) AS u(id, n) WHERE p.id = u.id`
    const ens = [...new Map(changes.map((c) => [c.en, c.next])).entries()]
    const t = await tx.$executeRaw`UPDATE "CommerceTranslation" t SET text = u.n, source = 'manual', reviewed = true, "updatedAt" = now() FROM unnest(${ens.map((e) => e[0])}::text[], ${ens.map((e) => e[1])}::text[]) AS u(en, n) WHERE t."sourceText" = u.en AND t."targetLang" = 'ro'`
    console.log(`produse actualizate: ${n} | rânduri de traducere actualizate: ${t}`)
  })
}
if (process.argv[1]?.includes('rename-bumper-trims')) main().then(() => process.exit(0)).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
