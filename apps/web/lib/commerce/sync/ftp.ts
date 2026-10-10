/**
 * Read-only FTPS client for the supplier feed. Only SIZE, MDTM and RETR are ever issued — never delete/rename/upload.
 *
 * - Explicit FTPS on port 21. The server's certificate is issued for *.namebox.ro and does not match the host name, so the
 *   host-name check is skipped; the certificate chain is still verified. Set COMMERCE_FTP_CERT_SHA256 (colon-less or colon-
 *   separated SHA-256 fingerprint) to pin the exact certificate instead — recommended.
 * - A single connection (the server allows 50) with connect/command timeouts and an overall transfer deadline.
 * - The password comes from the environment (COMMERCE_FTP_PASSWORD) and is never logged or placed in errors.
 */
import { Client } from 'basic-ftp'
import type { ConnectionOptions } from 'node:tls'
import { createHash } from 'node:crypto'
import { createReadStream, mkdirSync } from 'node:fs'
import path from 'node:path'

export interface FtpSettings {
  host: string
  port: number
  user: string
  password: string
  certSha256: string | null
  timeoutMs: number
}

export function ftpSettingsFromEnv(env = process.env): FtpSettings {
  const password = env.COMMERCE_FTP_PASSWORD
  if (!password) throw new Error('COMMERCE_FTP_PASSWORD is not configured')
  return {
    host: env.COMMERCE_FTP_HOST || 'ftp.doarpieseauto.ro',
    port: Number(env.COMMERCE_FTP_PORT || 21),
    user: env.COMMERCE_FTP_USER || 'env@doarpieseauto.ro',
    password,
    certSha256: env.COMMERCE_FTP_CERT_SHA256 ? env.COMMERCE_FTP_CERT_SHA256.replace(/:/g, '').toLowerCase() : null,
    timeoutMs: Number(env.COMMERCE_FTP_TIMEOUT_MS || 30_000),
  }
}

export interface RemoteFileInfo { name: string; size: number; mtime: Date }
export interface Downloaded extends RemoteFileInfo { localPath: string; sha256: string }

export function sha256File(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const h = createHash('sha256')
    createReadStream(file).on('data', (d) => h.update(d)).on('error', reject).on('end', () => resolve(h.digest('hex')))
  })
}

function tlsOptions(cfg: FtpSettings): ConnectionOptions {
  return {
    // Chain is verified (rejectUnauthorized stays true); only the host-name comparison is replaced.
    checkServerIdentity: (_host, cert) => {
      if (cfg.certSha256) {
        const fp = (cert.fingerprint256 || '').replace(/:/g, '').toLowerCase()
        if (fp !== cfg.certSha256) return new Error('FTPS certificate fingerprint does not match COMMERCE_FTP_CERT_SHA256')
      }
      return undefined
    },
  }
}

export class SupplierFtp {
  private client: Client | null = null
  constructor(private readonly cfg: FtpSettings) {}

  async connect(): Promise<void> {
    const client = new Client(this.cfg.timeoutMs)
    client.ftp.verbose = false
    try {
      await client.access({
        host: this.cfg.host, port: this.cfg.port, user: this.cfg.user, password: this.cfg.password,
        secure: true, // explicit FTPS (AUTH TLS)
        secureOptions: tlsOptions(this.cfg),
      })
    } catch (e) {
      client.close()
      throw new Error(`FTP connect failed: ${scrub(e, this.cfg.password)}`)
    }
    this.client = client
  }

  /** SIZE + MDTM (UTC per RFC 3659) of a file in the FTP root. */
  async stat(name: string): Promise<RemoteFileInfo> {
    const c = this.need()
    assertSafeName(name)
    try {
      // basic-ftp runs one command at a time: sequential on purpose
      const size = await c.size(name)
      const mtime = await c.lastMod(name)
      return { name, size, mtime }
    } catch (e) {
      throw new Error(`FTP stat ${name} failed: ${scrub(e, this.cfg.password)}`)
    }
  }

  async download(name: string, destDir: string): Promise<Downloaded> {
    const c = this.need()
    assertSafeName(name)
    mkdirSync(destDir, { recursive: true, mode: 0o700 })
    const info = await this.stat(name)
    const localPath = path.join(destDir, name)
    try {
      await c.downloadTo(localPath, name)
    } catch (e) {
      throw new Error(`FTP download ${name} failed: ${scrub(e, this.cfg.password)}`)
    }
    return { ...info, localPath, sha256: await sha256File(localPath) }
  }

  close(): void {
    this.client?.close()
    this.client = null
  }

  private need(): Client {
    if (!this.client) throw new Error('FTP not connected')
    return this.client
  }
}

/** Only plain file names from our own configuration reach the FTP server. */
export function assertSafeName(name: string): void {
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(name) || name.includes('..')) throw new Error(`Unsafe remote file name: ${name}`)
}

function scrub(e: unknown, secret: string): string {
  const msg = e instanceof Error ? e.message : String(e)
  return secret ? msg.split(secret).join('***') : msg
}
