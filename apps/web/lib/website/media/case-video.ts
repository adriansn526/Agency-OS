/**
 * Videos a doctor uploads from the phone for a "cazuistică" case.
 *
 * Like the hero video, what is uploaded is never served as it came: the type is read from the bytes, the file is probed, scaled to at most 1280 px and
 * re-encoded as H.264 **without sound and without metadata** (a patient's voice or a recording's hidden data could identify them), and a poster frame is cut.
 * Phone clips are big and the conversion takes a while, so the upload returns a job id at once and the conversion runs in the background; the page polls the job.
 * One conversion runs at a time (shared with the hero video).
 */
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { db } from '@repo/db'
import { AdminError } from '../admin/errors'
import { PUBLIC_PREFIX, spacesStore, type ObjectStore } from './storage'
import { exclusive, sniffVideo } from './video'

const run = promisify(execFile)
export const CASE_VIDEO_ALT = 'cazuistica-video'
export const CASE_POSTER_ALT = 'cazuistica-poster'
export const CASE_VIDEO_LIMITS = { maxUploadBytes: 90_000_000, maxInputSeconds: 300, maxOutputSeconds: 120, maxOutputBytes: 40_000_000, maxSide: 4096, outWidth: 1280, perEntry: 5 }
const FF = ['-hide_banner', '-loglevel', 'error', '-nostdin']

export interface CaseVideoFile { video: Buffer; poster: Buffer; width: number; height: number; seconds: number; posterWidth: number; posterHeight: number }

async function probe(file: string) {
  try {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file], { timeout: 20_000, maxBuffer: 1_000_000 })
    const j = JSON.parse(stdout) as { streams?: { width?: number; height?: number }[]; format?: { duration?: string } }
    const s = j.streams?.[0], seconds = Number(j.format?.duration)
    if (!s?.width || !s.height || !Number.isFinite(seconds)) throw new Error('no video stream')
    return { width: s.width, height: s.height, seconds }
  } catch { throw new AdminError('Fișierul nu este un video valid (mp4 sau mov de pe telefon)', 422) }
}

export function transcodeCaseVideo(input: Buffer): Promise<CaseVideoFile> {
  return exclusive(async () => {
    const L = CASE_VIDEO_LIMITS
    const dir = await mkdtemp(path.join(tmpdir(), 'case-'))
    try {
      const src = path.join(dir, `in.${sniffVideo(input) ?? 'mp4'}`), out = path.join(dir, 'out.mp4'), frame = path.join(dir, 'poster.png')
      await writeFile(src, input)
      const info = await probe(src)
      if (info.seconds > L.maxInputSeconds) throw new AdminError(`Videoul durează ${Math.round(info.seconds)} s; maxim ${L.maxInputSeconds} s`, 422)
      if (Math.max(info.width, info.height) > L.maxSide) throw new AdminError(`Rezoluție prea mare (maxim ${L.maxSide}px)`, 422)
      let produced = false
      for (const [width, crf] of [[L.outWidth, '28'], [960, '31'], [640, '34']] as const) {
        try {
          await run('ffmpeg', [...FF, '-y', '-protocol_whitelist', 'file', '-i', src, '-t', String(L.maxOutputSeconds), '-an', '-map_metadata', '-1', '-vf', `scale='min(${width},iw)':-2,fps=30`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { timeout: 240_000 })
        } catch { throw new AdminError('Videoul nu a putut fi procesat. Încearcă alt fișier (mp4 sau mov de pe telefon).', 422) }
        if ((await readFile(out)).length <= L.maxOutputBytes) { produced = true; break }
      }
      if (!produced) throw new AdminError('Videoul rămâne prea mare după comprimare. Scurtează-l.', 422)
      const video = await readFile(out), outInfo = await probe(out)
      try { await run('ffmpeg', [...FF, '-y', '-i', out, '-ss', String(Math.min(0.5, Math.max(0, outInfo.seconds / 2))), '-frames:v', '1', frame], { timeout: 30_000 }) } catch { throw new AdminError('Nu am putut extrage imaginea de previzualizare din video', 422) }
      const p = await sharp(await readFile(frame)).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer({ resolveWithObject: true })
      return { video, poster: p.data, width: outInfo.width, height: outInfo.height, seconds: Math.round(outInfo.seconds * 10) / 10, posterWidth: p.info.width, posterHeight: p.info.height }
    } finally { await rm(dir, { recursive: true, force: true }).catch(() => undefined) }
  })
}

export interface CaseVideoResult { video: { id: string; url: string }; poster: { id: string; url: string }; width: number; height: number; seconds: number }
export interface CaseVideoJob { status: 'processing' | 'done' | 'error'; entryId: string; at: number; error?: string; result?: CaseVideoResult; done: Promise<void> }

// the jobs live in memory: if the service restarts mid-conversion the page finds no job and asks the doctor to upload again
const g = globalThis as unknown as { __caseVideoJobs?: Map<string, CaseVideoJob> }
const jobs = (g.__caseVideoJobs ??= new Map())
const TTL = 30 * 60_000
const sweep = () => { const now = Date.now(); for (const [k, v] of jobs) if (now - v.at > TTL) jobs.delete(k) }

/** Checks the upload and starts the conversion; returns the job id. */
export async function startCaseVideo(lineId: string, entryId: string, file: Buffer, o: { store?: ObjectStore; transcode?: typeof transcodeCaseVideo } = {}): Promise<string> {
  sweep()
  const L = CASE_VIDEO_LIMITS
  if (file.length === 0) throw new AdminError('Fișierul este gol', 422)
  if (file.length > L.maxUploadBytes) throw new AdminError(`Videoul depășește ${Math.round(L.maxUploadBytes / 1_000_000)} MB`, 413)
  if (!sniffVideo(file)) throw new AdminError('Format neacceptat. Folosește un video mp4 sau mov (de pe telefon).', 415)
  const e = await db.websiteEntry.findFirst({ where: { id: entryId, businessLineId: lineId }, select: { id: true } })
  if (!e) throw new AdminError('Intrarea nu există', 404)
  const have = await db.websiteMedia.count({ where: { entryId, kind: 'file', alt: CASE_VIDEO_ALT } })
  const running = [...jobs.values()].filter((j) => j.entryId === entryId && j.status === 'processing').length
  if (have + running >= L.perEntry) throw new AdminError(`Maxim ${L.perEntry} videoclipuri încărcate. Șterge unul ca să adaugi altul.`, 409)

  const id = randomBytes(10).toString('hex')
  const store = o.store ?? spacesStore
  const job: CaseVideoJob = { status: 'processing', entryId, at: Date.now(), done: Promise.resolve() }
  job.done = (async () => {
    try {
      const v = await (o.transcode ?? transcodeCaseVideo)(file)
      const key = randomBytes(8).toString('hex')
      const vKey = `${PUBLIC_PREFIX}${lineId}/${entryId}/caz-${key}.mp4`, pKey = `${PUBLIC_PREFIX}${lineId}/${entryId}/caz-poster-${key}.webp`
      await store.put(vKey, v.video, 'video/mp4')
      try { await store.put(pKey, v.poster, 'image/webp') } catch (err) { await store.remove(vKey).catch(() => undefined); throw err }
      try {
        const [vm, pm] = await db.$transaction([
          db.websiteMedia.create({ data: { entryId, kind: 'file', storageKey: vKey, url: store.publicUrl(vKey), alt: CASE_VIDEO_ALT, mimeType: 'video/mp4', sizeBytes: v.video.length, width: v.width, height: v.height, sortOrder: 950 } }),
          db.websiteMedia.create({ data: { entryId, kind: 'file', storageKey: pKey, url: store.publicUrl(pKey), alt: CASE_POSTER_ALT, mimeType: 'image/webp', sizeBytes: v.poster.length, width: v.posterWidth, height: v.posterHeight, sortOrder: 951 } }),
        ])
        job.result = { video: { id: vm.id, url: vm.url }, poster: { id: pm.id, url: pm.url }, width: v.width, height: v.height, seconds: v.seconds }
        job.status = 'done'
      } catch (err) { await Promise.all([store.remove(vKey), store.remove(pKey)]).catch(() => undefined); throw err }
    } catch (err) {
      job.status = 'error'
      job.error = err instanceof AdminError ? err.message : 'Videoul nu a putut fi procesat. Încearcă din nou.'
      if (!(err instanceof AdminError)) console.error('[case-video]', err instanceof Error ? err.message : err)
    }
  })()
  jobs.set(id, job)
  return id
}

export function caseVideoJob(entryId: string, jobId: string): Pick<CaseVideoJob, 'status' | 'error' | 'result'> | null {
  const j = jobs.get(jobId)
  return j && j.entryId === entryId ? { status: j.status, error: j.error, result: j.result } : null
}

export const caseVideoDone = (jobId: string) => jobs.get(jobId)?.done
