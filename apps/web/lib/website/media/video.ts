/**
 * The hero background video of a firm's page.
 *
 * What is uploaded is never served as it came: the type comes from the bytes, the file is probed, trimmed to 20 s, scaled down to at most 1280 px,
 * re-encoded as H.264 without audio and without metadata (small, autoplay-friendly, nothing hidden inside) and a poster frame is cut as WebP.
 * ffmpeg runs without network access to anything but the temp file and with a time limit; one transcode at a time.
 */
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import sharp from 'sharp'
import { AdminError } from '../admin/errors'

const run = promisify(execFile)

export const VIDEO_LIMITS = { maxUploadBytes: 20_000_000, maxInputSeconds: 120, maxOutputSeconds: 20, maxOutputBytes: 8_000_000, maxSide: 4096, outWidth: 1280 }

/** 'mp4' (also QuickTime) or 'webm' from the first bytes, else null. */
export function sniffVideo(b: Uint8Array): 'mp4' | 'webm' | null {
  if (b.length < 16) return null
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return 'mp4'            // "ftyp"
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'webm'           // EBML (WebM / Matroska)
  return null
}

export interface HeroVideo { video: Buffer; poster: Buffer; width: number; height: number; seconds: number; posterWidth: number; posterHeight: number }

let chain: Promise<unknown> = Promise.resolve()
/** Transcodes are CPU heavy: they run one after another. */
const exclusive = <T>(fn: () => Promise<T>): Promise<T> => { const p = chain.then(fn, fn); chain = p.catch(() => undefined); return p }

const FF = ['-hide_banner', '-loglevel', 'error', '-nostdin']

async function probe(file: string): Promise<{ width: number; height: number; seconds: number }> {
  try {
    const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file], { timeout: 20_000, maxBuffer: 1_000_000 })
    const j = JSON.parse(stdout) as { streams?: { width?: number; height?: number }[]; format?: { duration?: string } }
    const s = j.streams?.[0]
    const seconds = Number(j.format?.duration)
    if (!s?.width || !s.height || !Number.isFinite(seconds)) throw new Error('no video stream')
    return { width: s.width, height: s.height, seconds }
  } catch { throw new AdminError('Fișierul nu este un video valid (mp4 sau webm)', 422) }
}

export function transcodeHeroVideo(input: Buffer): Promise<HeroVideo> {
  return exclusive(async () => {
    if (input.length === 0) throw new AdminError('Fișierul este gol', 422)
    if (input.length > VIDEO_LIMITS.maxUploadBytes) throw new AdminError(`Videoul depășește ${Math.round(VIDEO_LIMITS.maxUploadBytes / 1_000_000)} MB`, 413)
    const kind = sniffVideo(input)
    if (!kind) throw new AdminError('Format neacceptat. Folosește un video mp4 sau webm.', 415)
    const dir = await mkdtemp(path.join(tmpdir(), 'hero-'))
    try {
      const src = path.join(dir, `in.${kind}`), out = path.join(dir, 'out.mp4'), frame = path.join(dir, 'poster.png')
      await writeFile(src, input)
      const info = await probe(src)
      if (info.seconds > VIDEO_LIMITS.maxInputSeconds) throw new AdminError(`Videoul durează ${Math.round(info.seconds)} s; maxim ${VIDEO_LIMITS.maxInputSeconds} s (se păstrează primele ${VIDEO_LIMITS.maxOutputSeconds} s)`, 422)
      if (Math.max(info.width, info.height) > VIDEO_LIMITS.maxSide) throw new AdminError(`Rezoluție prea mare (maxim ${VIDEO_LIMITS.maxSide}px)`, 422)
      let produced = false
      for (const [width, crf] of [[VIDEO_LIMITS.outWidth, '28'], [960, '32'], [640, '34']] as const) {
        try {
          await run('ffmpeg', [...FF, '-y', '-protocol_whitelist', 'file', '-i', src, '-t', String(VIDEO_LIMITS.maxOutputSeconds), '-an', '-map_metadata', '-1', '-vf', `scale='min(${width},iw)':-2,fps=30`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { timeout: 120_000 })
        } catch { throw new AdminError('Videoul nu a putut fi procesat. Încearcă alt fișier (mp4 H.264 recomandat).', 422) }
        const size = (await readFile(out)).length
        if (size <= VIDEO_LIMITS.maxOutputBytes) { produced = true; break }
      }
      if (!produced) throw new AdminError('Videoul rămâne prea mare după comprimare. Scurtează-l sau scade rezoluția.', 422)
      const video = await readFile(out)
      const outInfo = await probe(out)
      try { await run('ffmpeg', [...FF, '-y', '-i', out, '-ss', String(Math.min(0.5, Math.max(0, outInfo.seconds / 2))), '-frames:v', '1', frame], { timeout: 30_000 }) } catch { throw new AdminError('Nu am putut extrage imaginea de previzualizare din video', 422) }
      const p = await sharp(await readFile(frame)).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true })
      return { video, poster: p.data, width: outInfo.width, height: outInfo.height, seconds: Math.round(outInfo.seconds * 10) / 10, posterWidth: p.info.width, posterHeight: p.info.height }
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined)
    }
  })
}
