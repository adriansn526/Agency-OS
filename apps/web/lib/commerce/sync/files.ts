/**
 * Getting the two feed files onto local disk: from the supplier FTP (read-only) or from a local directory (tests / replays).
 * Downloads go to a private temp dir first and only move into raw/<date>/ once complete. Raw files are kept for 7 days.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, rmdirSync } from 'node:fs'
import path from 'node:path'
import { sha256File, type Downloaded, type RemoteFileInfo } from './ftp'

export type FileKey = 'pricelist' | 'outofstock'

export interface FeedFileRef {
  key: FileKey
  name: string
  path: string
  size: number
  mtime: Date
  sha256: string
}

export interface PrevFileState { remoteMtime: Date; size: number; sha256: string; rows: number }

export interface FtpLike {
  connect(): Promise<void>
  stat(name: string): Promise<RemoteFileInfo>
  download(name: string, destDir: string): Promise<Downloaded>
  close(): void
}

export type FileSource =
  | { kind: 'ftp'; ftp: FtpLike; names: Record<FileKey, string> }
  | { kind: 'local'; dir: string }

export interface Acquired {
  files: Partial<Record<FileKey, FeedFileRef>>
  /** keys whose content is unchanged since the last applied run (not downloaded or identical hash) */
  unchanged: FileKey[]
}

const KEYS: FileKey[] = ['pricelist', 'outofstock']
const LOCAL_PATTERNS: Record<FileKey, RegExp> = { pricelist: /^PRICELIST.*\.(zip|txt)$/i, outofstock: /^OUTOFSTOCK.*\.(zip|txt)$/i }

export const bucharestDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(d)

export async function acquireFiles(opts: {
  source: FileSource
  dataDir: string
  runId: string
  prev: Map<string, PrevFileState>
  /** ignore the "unchanged" shortcut (forced / dry-run) */
  force: boolean
  want: Record<FileKey, boolean>
  tick: () => void
}): Promise<Acquired> {
  const out: Acquired = { files: {}, unchanged: [] }
  const keys = KEYS.filter((k) => opts.want[k])

  if (opts.source.kind === 'local') {
    const dir = opts.source.dir
    const names = readdirSync(dir)
    for (const key of keys) {
      const found = names.filter((n) => LOCAL_PATTERNS[key].test(n)).sort()
      if (!found.length) throw new Error(`No ${key} file in ${dir}`)
      // Prefer the zip (what the supplier publishes) over an already-extracted .txt
      const name = found.find((n) => /\.zip$/i.test(n)) ?? found[0]!
      const p = path.join(dir, name)
      const st = statSync(p)
      out.files[key] = { key, name, path: p, size: st.size, mtime: st.mtime, sha256: await sha256File(p) }
      const prev = opts.prev.get(key)
      if (!opts.force && prev && prev.sha256 === out.files[key]!.sha256) { out.unchanged.push(key); delete out.files[key] }
    }
    return out
  }

  const { ftp, names } = opts.source
  const tmp = path.join(opts.dataDir, 'tmp', opts.runId)
  try {
    await ftp.connect()
    for (const key of keys) {
      opts.tick()
      const prev = opts.prev.get(key)
      const info = await ftp.stat(names[key])
      if (!opts.force && prev && prev.remoteMtime.getTime() === info.mtime.getTime() && prev.size === info.size) {
        out.unchanged.push(key)
        continue
      }
      const dl = await ftp.download(names[key], tmp)
      if (dl.size !== info.size && statSync(dl.localPath).size !== info.size) throw new Error(`${names[key]}: downloaded size does not match the server's SIZE`)
      if (!opts.force && prev && prev.sha256 === dl.sha256) {
        out.unchanged.push(key)
        unlinkSync(dl.localPath)
        continue
      }
      const dest = path.join(opts.dataDir, 'raw', bucharestDay(dl.mtime))
      mkdirSync(dest, { recursive: true })
      let target = path.join(dest, names[key])
      if (existsSync(target) && (await sha256File(target)) !== dl.sha256) {
        // same name, different content, same day (supplier regenerated): keep both
        target = path.join(dest, `${path.parse(names[key]).name}.${dl.mtime.toISOString().slice(11, 16).replace(':', '')}${path.extname(names[key])}`)
      }
      try { renameSync(dl.localPath, target) } catch { copyFileSync(dl.localPath, target); unlinkSync(dl.localPath) }
      out.files[key] = { key, name: names[key], path: target, size: dl.size, mtime: dl.mtime, sha256: dl.sha256 }
    }
  } finally {
    ftp.close()
    rmSync(tmp, { recursive: true, force: true })
  }
  return out
}

/** Deletes our zip files from raw/<date>/ folders older than `keepDays`; leaves anything else (and non-date folders) untouched. */
export function pruneRaw(dataDir: string, keepDays = 7, now = new Date()): string[] {
  const root = path.join(dataDir, 'raw')
  if (!existsSync(root)) return []
  const cutoff = bucharestDay(new Date(now.getTime() - keepDays * 86_400_000))
  const removed: string[] = []
  for (const d of readdirSync(root)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d >= cutoff) continue
    const dir = path.join(root, d)
    for (const f of readdirSync(dir)) {
      if (!/^(PRICELIST|OUTOFSTOCK)[\w.-]*\.zip$/i.test(f)) continue
      unlinkSync(path.join(dir, f))
      removed.push(path.join(d, f))
    }
    try { rmdirSync(dir) } catch { /* not empty: it holds files that are not ours */ }
  }
  return removed
}
