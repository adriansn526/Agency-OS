/**
 * System Health Monitoring
 * Checks: Disk, RAM, SSL Certificates, Docker containers, PM2 processes, Email (Mailcow)
 * 
 * Runs server-side via cron endpoint — uses child_process for system commands
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// ─── Types ───

export interface DiskStatus {
  filesystem: string
  size: string
  used: string
  available: string
  usedPercent: number
}

export interface RamStatus {
  totalGb: number
  usedGb: number
  availableGb: number
  usedPercent: number
  swapUsedPercent: number
}

export interface SSLCertStatus {
  domain: string
  validUntil: string
  daysRemaining: number
  isExpiring: boolean  // < 14 days
  isExpired: boolean
  error?: string
}

export interface DockerContainerStatus {
  name: string
  status: string
  isHealthy: boolean
  restarts?: number
}

export interface PM2ProcessStatus {
  name: string
  id: number
  status: string
  restarts: number
  memory: string
  cpu: string
  uptime: string
}

export interface EmailHealthStatus {
  smtpResponsive: boolean
  imapResponsive: boolean
  webmailResponsive: boolean
  mailcowApiResponsive: boolean
  queueSize: number
  error?: string
}

export interface SystemHealthReport {
  disk: DiskStatus
  ram: RamStatus
  ssl: SSLCertStatus[]
  docker: {
    total: number
    running: number
    unhealthy: DockerContainerStatus[]
  }
  pm2: PM2ProcessStatus[]
  email: EmailHealthStatus
  timestamp: string
}

// ─── Disk ───

export async function checkDisk(): Promise<DiskStatus> {
  try {
    const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $1, $2, $3, $4, $5}'")
    const parts = stdout.trim().split(/\s+/)
    return {
      filesystem: parts[0] ?? '/',
      size: parts[1] ?? '0',
      used: parts[2] ?? '0',
      available: parts[3] ?? '0',
      usedPercent: parseInt(parts[4] ?? '0'),
    }
  } catch {
    return { filesystem: '/', size: '0', used: '0', available: '0', usedPercent: 0 }
  }
}

// ─── RAM ───

export async function checkRam(): Promise<RamStatus> {
  try {
    const { stdout } = await execAsync("free -g | grep Mem | awk '{print $2, $3, $7}'; free -g | grep Swap | awk '{print $2, $3}'")
    const lines = stdout.trim().split('\n')
    const memParts = (lines[0] ?? '').split(/\s+/)
    const swapParts = (lines[1] ?? '0 0').split(/\s+/)
    const total = parseInt(memParts[0] ?? '0')
    const used = parseInt(memParts[1] ?? '0')
    const available = parseInt(memParts[2] ?? '0')
    const swapTotal = parseInt(swapParts[0] ?? '0')
    const swapUsed = parseInt(swapParts[1] ?? '0')
    return {
      totalGb: total,
      usedGb: used,
      availableGb: available,
      usedPercent: total > 0 ? Math.round((used / total) * 100) : 0,
      swapUsedPercent: swapTotal > 0 ? Math.round((swapUsed / swapTotal) * 100) : 0,
    }
  } catch {
    return { totalGb: 0, usedGb: 0, availableGb: 0, usedPercent: 0, swapUsedPercent: 0 }
  }
}

// ─── SSL Certificates ───

export async function checkSSL(domains: string[]): Promise<SSLCertStatus[]> {
  const checkOne = async (domain: string): Promise<SSLCertStatus> => {
    try {
      const { stdout } = await execAsync(
        `echo | timeout 3 openssl s_client -connect ${domain}:443 -servername ${domain} 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2`,
        { timeout: 6000 }
      )
      const dateStr = stdout.trim()
      if (!dateStr) throw new Error('No certificate found')

      const validUntil = new Date(dateStr)
      const now = new Date()
      const daysRemaining = Math.floor((validUntil.getTime() - now.getTime()) / 86400000)

      return {
        domain,
        validUntil: validUntil.toISOString().split('T')[0] ?? '',
        daysRemaining,
        isExpiring: daysRemaining < 14,
        isExpired: daysRemaining < 0,
      }
    } catch (err: any) {
      return {
        domain,
        validUntil: 'Unknown',
        daysRemaining: -1,
        isExpiring: true,
        isExpired: true,
        error: err.message,
      }
    }
  }

  return Promise.all(domains.map(checkOne))
}

// ─── Docker ───

export async function checkDocker(): Promise<{ total: number; running: number; unhealthy: DockerContainerStatus[] }> {
  try {
    const { stdout } = await execAsync(
      "docker ps -a --format '{{.Names}}|{{.Status}}' 2>/dev/null",
      { timeout: 10000 }
    )
    const lines = stdout.trim().split('\n').filter(Boolean)
    const containers: DockerContainerStatus[] = lines.map(line => {
      const parts = line.split('|')
      const name = parts[0] ?? ''
      const status = parts[1] ?? ''
      const isHealthy = status.includes('Up') && !status.includes('unhealthy')
      return { name, status, isHealthy }
    })

    const running = containers.filter(c => c.isHealthy).length
    const unhealthy = containers.filter(c => !c.isHealthy)

    return { total: containers.length, running, unhealthy }
  } catch {
    return { total: 0, running: 0, unhealthy: [] }
  }
}

// ─── PM2 ───

export async function checkPM2(): Promise<PM2ProcessStatus[]> {
  try {
    const { stdout } = await execAsync(
      "pm2 jlist 2>/dev/null",
      { timeout: 10000 }
    )
    const processes = JSON.parse(stdout)
    return processes.map((p: any) => ({
      name: p.name,
      id: p.pm_id,
      status: p.pm2_env?.status || 'unknown',
      restarts: p.pm2_env?.restart_time || 0,
      memory: `${Math.round((p.monit?.memory || 0) / 1048576)}MB`,
      cpu: `${p.monit?.cpu || 0}%`,
      uptime: p.pm2_env?.pm_uptime
        ? `${Math.round((Date.now() - p.pm2_env.pm_uptime) / 3600000)}h`
        : '0h',
    }))
  } catch {
    return []
  }
}

// ─── Email (Mailcow) ───

export async function checkEmail(): Promise<EmailHealthStatus> {
  const host = 'mail.asns.ro'
  const result: EmailHealthStatus = {
    smtpResponsive: false,
    imapResponsive: false,
    webmailResponsive: false,
    mailcowApiResponsive: false,
    queueSize: 0,
  }

  // SMTP check (port 587)
  try {
    const { stdout } = await execAsync(
      `echo "QUIT" | timeout 5 openssl s_client -connect ${host}:587 -starttls smtp -quiet 2>/dev/null | head -1`,
      { timeout: 8000 }
    )
    result.smtpResponsive = stdout.includes('220') || stdout.includes('250') || stdout.length > 0
  } catch {
    // Try plain connection
    try {
      const { stdout } = await execAsync(
        `echo "QUIT" | timeout 3 nc -w3 ${host} 25 2>/dev/null | head -1`,
        { timeout: 5000 }
      )
      result.smtpResponsive = stdout.includes('220')
    } catch { /* SMTP down */ }
  }

  // IMAP check (port 993)
  try {
    const { stdout } = await execAsync(
      `echo "" | timeout 5 openssl s_client -connect ${host}:993 -quiet 2>/dev/null | head -1`,
      { timeout: 8000 }
    )
    result.imapResponsive = stdout.includes('OK') || stdout.includes('IMAP') || stdout.length > 0
  } catch { /* IMAP down */ }

  // Webmail check (HTTPS)
  try {
    const res = await fetch(`https://${host}/SOGo/`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    result.webmailResponsive = res.status < 500
  } catch { /* Webmail down */ }

  // Mailcow API check
  try {
    const res = await fetch(`https://${host}/api/v1/get/status/containers`, {
      headers: { 'X-API-Key': process.env.MAILCOW_API_KEY || '' },
      signal: AbortSignal.timeout(5000),
    })
    result.mailcowApiResponsive = res.ok
  } catch { /* API down */ }

  // Mail queue size (via Docker exec)
  try {
    const { stdout } = await execAsync(
      "docker exec mailcowdockerized-postfix-mailcow-1 mailq 2>/dev/null | tail -1",
      { timeout: 8000 }
    )
    const match = stdout.match(/(\d+)\s+Request/)
    result.queueSize = match?.[1] ? parseInt(match[1]) : 0
  } catch { /* queue check failed */ }

  return result
}

// ─── Full Health Report ───

export async function getFullHealthReport(sslDomains: string[]): Promise<SystemHealthReport> {
  const [disk, ram, ssl, docker, pm2, email] = await Promise.all([
    checkDisk(),
    checkRam(),
    checkSSL(sslDomains),
    checkDocker(),
    checkPM2(),
    checkEmail(),
  ])

  return {
    disk,
    ram,
    ssl,
    docker,
    pm2,
    email,
    timestamp: new Date().toISOString(),
  }
}
