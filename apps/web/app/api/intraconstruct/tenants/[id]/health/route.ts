// ═══════════════════════════════════════════════════════
// Agency-OS — Health Check for IntraConstruct Tenant
// ═══════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs/promises"

const execAsync = promisify(exec)

const DB_CONTAINER = "agency-os-postgres"
const DB_USER = "agency_os"
const DB_NAME = "intraconstruct_erp"
const BACKUP_ROOT = "/home/asns/backups/intraconstruct"

interface RouteParams {
  params: Promise<{ id: string }>
}

async function runPsql(sql: string): Promise<string> {
  const cmd = `docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -t -A -c "${sql.replace(/"/g, '\\"')}" 2>/dev/null`
  try {
    const { stdout } = await execAsync(cmd, { timeout: 10000 })
    return stdout.trim()
  } catch {
    return ""
  }
}

// ─── GET — Health status ───
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: tenantId } = await params

    // Parallel health checks
    const [
      dbPing,
      dbSize,
      tableCounts,
      lastActivity,
      pm2Status,
      diskUsage,
      lastBackup,
    ] = await Promise.allSettled([
      // 1. DB ping + latency
      (async () => {
        const start = Date.now()
        const result = await runPsql("SELECT 1")
        const latency = Date.now() - start
        return { ok: result === "1", latencyMs: latency }
      })(),

      // 2. DB size
      (async () => {
        const result = await runPsql(`SELECT pg_size_pretty(pg_database_size('${DB_NAME}'))`)
        return result || "N/A"
      })(),

      // 3. Table counts per tenant
      (async () => {
        const tables = ["Client", "Material", "Offer", "Project", "Invoice", "LaborNorm", "Supplier", "Employee"]
        const counts: Record<string, number> = {}
        for (const table of tables) {
          const result = await runPsql(
            `SELECT count(*) FROM \\"${table}\\" WHERE \\"tenantId\\" = '${tenantId}'`
          )
          counts[table] = parseInt(result) || 0
        }
        return counts
      })(),

      // 4. Last activity
      (async () => {
        const result = await runPsql(
          `SELECT to_char(\\"createdAt\\", 'YYYY-MM-DD HH24:MI:SS') FROM \\"ActivityLog\\" WHERE \\"tenantId\\" = '${tenantId}' ORDER BY \\"createdAt\\" DESC LIMIT 1`
        )
        return result || null
      })(),

      // 5. PM2 status
      (async () => {
        try {
          const { stdout } = await execAsync("pm2 jlist 2>/dev/null", { timeout: 5000 })
          const processes = JSON.parse(stdout)
          const icProcess = processes.find((p: any) =>
            p.name?.includes("intraconstruct") || p.name?.includes("erp") || p.pm2_env?.cwd?.includes("IntraConstruct")
          )
          if (icProcess) {
            return {
              name: icProcess.name,
              status: icProcess.pm2_env?.status || "unknown",
              uptime: icProcess.pm2_env?.pm_uptime || 0,
              restarts: icProcess.pm2_env?.restart_time || 0,
              memory: icProcess.monit?.memory || 0,
              cpu: icProcess.monit?.cpu || 0,
            }
          }
          return { name: "N/A", status: "not_found" }
        } catch {
          return { name: "N/A", status: "error" }
        }
      })(),

      // 6. Disk usage
      (async () => {
        try {
          const { stdout } = await execAsync("df -h / | tail -1 | awk '{print $3\"/\"$2\" (\"$5\")\"}'", { timeout: 5000 })
          return stdout.trim()
        } catch {
          return "N/A"
        }
      })(),

      // 7. Last backup info
      (async () => {
        try {
          const entries = await fs.readdir(BACKUP_ROOT)
          const tarballs = entries.filter((f) => f.endsWith(".tar.gz")).sort().reverse()
          if (tarballs.length === 0) return null

          const latest = tarballs[0]!
          const stat = await fs.stat(`${BACKUP_ROOT}/${latest}`)
          const dateMatch = latest.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})/)
          let date = stat.mtime.toISOString()
          if (dateMatch) {
            date = `${dateMatch[1]}T${dateMatch[2]}:${dateMatch[3]}:00Z`
          }

          return {
            filename: latest,
            date,
            size: stat.size,
            sizeHuman: formatBytes(stat.size),
            totalBackups: tarballs.length,
          }
        } catch {
          return null
        }
      })(),
    ])

    // Check cron
    let cronActive = false
    try {
      const { stdout } = await execAsync("cat /etc/cron.d/intraconstruct-backup 2>/dev/null || echo ''")
      cronActive = stdout.includes("backup-db.sh")
    } catch {
      // ignore
    }

    const health = {
      database: {
        status: dbPing.status === "fulfilled" && dbPing.value.ok ? "healthy" : "error",
        latencyMs: dbPing.status === "fulfilled" ? dbPing.value.latencyMs : null,
        size: dbSize.status === "fulfilled" ? dbSize.value : "N/A",
      },
      tables: tableCounts.status === "fulfilled" ? tableCounts.value : {},
      lastActivity: lastActivity.status === "fulfilled" ? lastActivity.value : null,
      pm2: pm2Status.status === "fulfilled" ? pm2Status.value : { status: "unknown" },
      disk: diskUsage.status === "fulfilled" ? diskUsage.value : "N/A",
      backup: {
        last: lastBackup.status === "fulfilled" ? lastBackup.value : null,
        cronActive,
      },
      checkedAt: new Date().toISOString(),
    }

    return NextResponse.json(health)
  } catch (error: any) {
    console.error("[health] GET error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}
