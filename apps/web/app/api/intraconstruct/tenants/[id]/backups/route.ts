// ═══════════════════════════════════════════════════════
// Agency-OS — Backup Operations for IntraConstruct Tenant
// ═══════════════════════════════════════════════════════

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs/promises"
import path from "path"

const execAsync = promisify(exec)

const BACKUP_ROOT = "/home/asns/backups/intraconstruct"
const BACKUP_SCRIPT = "/home/asns/projects/AdvancedSystems/IntraConstruct-ERP/scripts/backup-db.sh"
const RESTORE_SCRIPT = "/home/asns/projects/AdvancedSystems/IntraConstruct-ERP/scripts/restore-db.sh"

interface RouteParams {
  params: Promise<{ id: string }>
}

// ─── GET — List available backups ───
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await params // consume params

    // List .tar.gz files in backup directory
    let files: string[] = []
    try {
      const entries = await fs.readdir(BACKUP_ROOT)
      files = entries.filter((f) => f.endsWith(".tar.gz")).sort().reverse()
    } catch {
      // Directory might not exist yet
    }

    const backups = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(BACKUP_ROOT, filename)
        const stat = await fs.stat(filePath)
        
        // Parse date from filename: 2026-06-02_0443.tar.gz
        const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})/)
        let date = stat.mtime.toISOString()
        if (dateMatch) {
          date = `${dateMatch[1]}T${dateMatch[2]}:${dateMatch[3]}:00Z`
        }

        return {
          filename,
          date,
          size: stat.size,
          sizeHuman: formatBytes(stat.size),
        }
      })
    )

    // Check cron status
    let cronActive = false
    try {
      const { stdout } = await execAsync("cat /etc/cron.d/intraconstruct-backup 2>/dev/null || echo ''")
      cronActive = stdout.includes("backup-db.sh")
    } catch {
      cronActive = false
    }

    return NextResponse.json({
      backups,
      cronActive,
      backupRoot: BACKUP_ROOT,
      totalBackups: backups.length,
    })
  } catch (error: any) {
    console.error("[backups] GET error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── POST — Trigger manual backup or restore ───
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await params
    const body = await req.json()
    const { action } = body

    if (action === "backup") {
      // Trigger backup script
      const { stdout, stderr } = await execAsync(`bash ${BACKUP_SCRIPT} 2>&1`, {
        timeout: 120000, // 2 min timeout
      })
      return NextResponse.json({
        success: true,
        action: "backup",
        output: stdout,
        error: stderr || null,
      })
    }

    if (action === "restore") {
      const { filename, tenantSlug } = body
      if (!filename) {
        return NextResponse.json({ error: "filename is required" }, { status: 400 })
      }

      const backupPath = path.join(BACKUP_ROOT, filename)
      
      // Security: validate filename (no path traversal)
      if (filename.includes("..") || filename.includes("/")) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
      }

      // Check file exists
      try {
        await fs.access(backupPath)
      } catch {
        return NextResponse.json({ error: "Backup file not found" }, { status: 404 })
      }

      // Run restore (tenant-only mode)
      const slug = tenantSlug || "aeroductr"
      const cmd = `bash ${RESTORE_SCRIPT} "${backupPath}" --tenant "${slug}" 2>&1`
      
      const { stdout, stderr } = await execAsync(cmd, {
        timeout: 300000, // 5 min timeout
      })

      return NextResponse.json({
        success: true,
        action: "restore",
        filename,
        tenantSlug: slug,
        output: stdout,
        error: stderr || null,
      })
    }

    if (action === "delete") {
      const { filename } = body
      if (!filename || filename.includes("..") || filename.includes("/")) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
      }

      const backupPath = path.join(BACKUP_ROOT, filename)
      await fs.unlink(backupPath)

      return NextResponse.json({ success: true, action: "delete", filename })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    console.error("[backups] POST error:", error.message)
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
