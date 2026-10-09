/**
 * Idempotent image import: lists the public bucket (read-only, via the `rclone lsf` remote), matches parts/<prefix4>/<SKU>[_N].<ext>
 * to products by SKU and upserts references into CommerceProductImage. Never writes to the bucket; never touches manual images.
 * Auto images that vanished from the bucket are flagged on one run (missingSince) and removed only on a LATER run.
 */
import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { db } from '@repo/db'

const KEY_RE = /^(\d{4})\/(\d{9})(?:_(\d+))?\.(jpe?g|png|webp)$/i
const CHUNK = 5000

export interface ImageImportReport {
  startedAt: string
  durationMs: number
  dryRun: boolean
  bucketFiles: number
  partsFiles: number
  efarFiles: number
  matchedFiles: number
  filesWithoutProduct: number
  filesBadPattern: number
  filesNonUtf8: number
  caseDuplicatesIgnored: number
  products: number
  productsWithImage: number
  productsWithoutImage: number
  productsOnlySuffixed: number
  inserted: number
  updated: number
  removed: number
  flaggedMissing: number
  errors: string[]
  files: { missingCsv?: string; efarList?: string; reportJson?: string }
}

function listBucket(remotePath: string): Promise<Array<{ key: string; size: number }> & { nonUtf8?: number }> {
  return new Promise((resolve, reject) => {
    const p = spawn('rclone', ['lsf', remotePath, '--recursive', '--files-only', '--format', 'ps', '--separator', '|', '--fast-list'], { stdio: ['ignore', 'pipe', 'pipe'] })
    const out: Buffer[] = []; let err = ''
    p.stdout.on('data', (c: Buffer) => out.push(c))
    p.stderr.on('data', (c: Buffer) => { err += c.toString().slice(0, 2000) })
    p.on('error', reject)
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`rclone lsf failed (${code}): ${err.slice(0, 300)}`))
      const dec = new TextDecoder('utf-8', { fatal: true })
      const rows: Array<{ key: string; size: number }> & { nonUtf8?: number } = []
      let bad = 0
      let start = 0
      const buf = Buffer.concat(out)
      while (start < buf.length) {
        let end = buf.indexOf(0x0a, start); if (end < 0) end = buf.length
        const line = buf.subarray(start, end); start = end + 1
        if (!line.length) continue
        const sep = line.lastIndexOf(0x7c)
        if (sep < 0) { bad++; continue }
        try { rows.push({ key: dec.decode(line.subarray(0, sep)), size: Number(line.subarray(sep + 1).toString()) || 0 }) } catch { bad++ }
      }
      rows.nonUtf8 = bad
      resolve(rows)
    })
  })
}

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

export async function runImageImport(opts: { dryRun?: boolean; remote?: string; bucket?: string; reportDir?: string } = {}): Promise<ImageImportReport> {
  const t0 = Date.now()
  const dryRun = !!opts.dryRun
  const remote = opts.remote ?? process.env.COMMERCE_IMAGES_RCLONE_REMOTE ?? 'spaces'
  const bucket = opts.bucket ?? process.env.COMMERCE_IMAGES_BUCKET ?? 'media-imgs'
  const reportDir = opts.reportDir ?? process.env.COMMERCE_IMAGES_REPORT_DIR ?? path.join(os.homedir(), 'commerce-image-reports')
  const errors: string[] = []

  const [lock] = await db.$queryRaw<Array<{ ok: boolean }>>`SELECT pg_try_advisory_lock(hashtext('commerce-image-import')) AS ok`
  if (!lock?.ok) throw new Error('Un import de poze rulează deja')
  try {
    // 1. List the bucket (read-only)
    const all = await listBucket(`${remote}:${bucket}`)
    const parts = all.filter((r) => r.key.startsWith('parts/'))
    const efar = all.filter((r) => r.key.startsWith('efar/'))

    // 2. SKU -> product
    const prodRows = await db.$queryRaw<Array<{ id: string; sku: string }>>`SELECT id, "supplierCode" AS sku FROM "CommerceProduct"`
    const bySku = new Map(prodRows.map((r) => [r.sku, r.id]))

    // 3. Match files to products
    type Cand = { key: string; size: number; n: number | null }
    const perSku = new Map<string, Cand[]>()
    let withoutProduct = 0, badPattern = 0, caseDup = 0, matched = 0
    for (const f of parts) {
      const m = KEY_RE.exec(f.key.slice('parts/'.length))
      if (!m || m[1] !== m[2]!.slice(0, 4)) { badPattern++; continue }
      const sku = m[2]!
      if (!bySku.has(sku)) { withoutProduct++; continue }
      const list = perSku.get(sku) ?? []
      list.push({ key: f.key, size: f.size, n: m[3] != null ? Number(m[3]) : null })
      perSku.set(sku, list)
    }
    // 4. Order per product: main (<SKU>.<ext>) first, then _N ascending; same slot twice (.jpg vs .JPG) -> keep lowercase ext
    const rowsPid: string[] = [], rowsKey: string[] = [], rowsPos: number[] = [], rowsSize: number[] = []
    let onlySuffixed = 0
    for (const [sku, list] of perSku) {
      const slots = new Map<number, Cand>() // -1 = main
      for (const c of list.sort((a, b) => a.key.localeCompare(b.key))) {
        const slot = c.n ?? -1
        const cur = slots.get(slot)
        if (!cur) { slots.set(slot, c); continue }
        caseDup++
        if (c.key.endsWith('.jpg') && !cur.key.endsWith('.jpg')) slots.set(slot, c)
      }
      if (!slots.has(-1)) onlySuffixed++
      const ordered = [...slots.entries()].sort((a, b) => a[0] - b[0]).map(([, c]) => c)
      ordered.forEach((c, i) => { rowsPid.push(bySku.get(sku)!); rowsKey.push(c.key); rowsPos.push(i); rowsSize.push(c.size); matched++ })
    }

    // Safety: refuse to touch the DB if the listing looks truncated
    const autoRows = await db.$queryRaw<Array<{ n: bigint }>>`SELECT count(*) AS n FROM "CommerceProductImage" WHERE source = 'auto'`
    const existingAuto = Number(autoRows[0]?.n ?? 0)
    if (parts.length < 1000 || (existingAuto > 0 && matched < existingAuto * 0.5)) {
      throw new Error(`Listarea pare incompletă (${parts.length} fișiere parts/, ${matched} potriviri, ${existingAuto} în DB); import oprit fără modificări`)
    }

    let inserted = 0, updated = 0, removed = 0, flagged = 0
    if (!dryRun) {
      const stamp = new Date(t0)
      for (let i = 0; i < rowsPid.length; i += CHUNK) {
        const res = await db.$queryRaw<Array<{ inserted: boolean }>>`
          INSERT INTO "CommerceProductImage" (id, "productId", "objectKey", position, "sizeBytes", source, "lastSeenAt", "createdAt", "updatedAt")
          SELECT gen_random_uuid()::text, u.pid, u.k, u.pos, u.sz, 'auto', ${stamp}::timestamp, now(), now()
          FROM unnest(${rowsPid.slice(i, i + CHUNK)}::text[], ${rowsKey.slice(i, i + CHUNK)}::text[], ${rowsPos.slice(i, i + CHUNK)}::int[], ${rowsSize.slice(i, i + CHUNK)}::int[]) AS u(pid, k, pos, sz)
          ON CONFLICT ("productId", "objectKey") DO UPDATE
            SET position = EXCLUDED.position, "sizeBytes" = EXCLUDED."sizeBytes", "lastSeenAt" = EXCLUDED."lastSeenAt", "missingSince" = NULL, "updatedAt" = now()
            WHERE "CommerceProductImage".source = 'auto'
          RETURNING (xmax = 0) AS inserted`
        for (const r of res) r.inserted ? inserted++ : updated++
      }
      // Gone from the bucket: removed only if ALREADY flagged by an earlier run, otherwise flag now
      removed = Number(await db.$executeRaw`DELETE FROM "CommerceProductImage" WHERE source = 'auto' AND "lastSeenAt" < ${stamp}::timestamp AND "missingSince" IS NOT NULL`)
      flagged = Number(await db.$executeRaw`UPDATE "CommerceProductImage" SET "missingSince" = ${stamp}::timestamp WHERE source = 'auto' AND "lastSeenAt" < ${stamp}::timestamp AND "missingSince" IS NULL`)
    }

    // 5. Coverage (live DB state; in dry-run this reflects the previous import)
    const [cov] = await db.$queryRaw<Array<{ total: bigint; withimg: bigint }>>`
      SELECT count(*) AS total, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM "CommerceProductImage" i WHERE i."productId" = p.id)) AS withimg FROM "CommerceProduct" p`
    const dryWith = new Set(rowsPid).size
    const total = Number(cov?.total ?? 0)
    const withImg = dryRun ? dryWith : Number(cov?.withimg ?? 0)

    // 6. Files
    const files: ImageImportReport['files'] = {}
    if (!dryRun) {
      fs.mkdirSync(reportDir, { recursive: true })
      const day = new Date(t0).toISOString().slice(0, 10)
      const missing = await db.$queryRaw<Array<{ sku: string; name: string | null; category: string | null }>>`
        SELECT p."supplierCode" AS sku, COALESCE(p."nameRo", p."nameEn") AS name, c."nameRo" AS category
        FROM "CommerceProduct" p LEFT JOIN "CommerceCategory" c ON c.id = p."categoryId"
        WHERE p."isActive" AND NOT EXISTS (SELECT 1 FROM "CommerceProductImage" i WHERE i."productId" = p.id)
        ORDER BY p."supplierCode"`
      files.missingCsv = path.join(reportDir, `products-without-image-${day}.csv`)
      fs.writeFileSync(files.missingCsv, '﻿' + 'SKU,Denumire,Categorie\n' + missing.map((r) => [r.sku, r.name, r.category].map(csvCell).join(',')).join('\n') + '\n')
      files.efarList = path.join(reportDir, 'efar-keys.txt') // listed only; no known rule to link them to products
      fs.writeFileSync(files.efarList, efar.map((r) => r.key).join('\n') + '\n')
    }

    const report: ImageImportReport = {
      startedAt: new Date(t0).toISOString(), durationMs: Date.now() - t0, dryRun,
      bucketFiles: all.length, partsFiles: parts.length, efarFiles: efar.length, matchedFiles: matched,
      filesWithoutProduct: withoutProduct, filesBadPattern: badPattern, filesNonUtf8: all.nonUtf8 ?? 0, caseDuplicatesIgnored: caseDup,
      products: total, productsWithImage: withImg, productsWithoutImage: total - withImg, productsOnlySuffixed: onlySuffixed,
      inserted, updated, removed, flaggedMissing: flagged, errors, files,
    }
    if (!dryRun) {
      fs.mkdirSync(reportDir, { recursive: true })
      report.files.reportJson = path.join(reportDir, `import-${new Date(t0).toISOString().replace(/[:.]/g, '-')}.json`)
      fs.writeFileSync(report.files.reportJson, JSON.stringify(report, null, 2))
    }
    return report
  } finally {
    await db.$queryRaw`SELECT pg_advisory_unlock(hashtext('commerce-image-import'))`
  }
}
