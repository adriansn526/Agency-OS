// ═══════════════════════════════════════════════════════
// Agency-OS — Tenant Migration API
// ═══════════════════════════════════════════════════════
// Handles the full migration flow:
// 1. Pre-flight checks (SSH, Docker, disk)
// 2. Export tenant DB data
// 3. Deploy Docker stack on remote server
// 4. Import DB + configure
// 5. Health check
//
// POST: Start migration / execute step
// GET: Check migration status

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@repo/db"
import { encrypt } from "@/lib/encryption"
import { testSSH, sshExec, sshUpload } from "@/lib/ssh"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

const DB_CONTAINER = "agency-os-postgres"
const DB_USER = "agency_os"
const DB_NAME = "intraconstruct_erp"

interface RouteParams {
  params: Promise<{ id: string }>
}

// ─── In-memory migration state ───
const migrationState = new Map<string, {
  status: "idle" | "running" | "completed" | "failed"
  currentStep: number
  totalSteps: number
  stepName: string
  logs: string[]
  error?: string
  startedAt?: Date
  completedAt?: Date
}>()

function getState(tenantId: string) {
  if (!migrationState.has(tenantId)) {
    migrationState.set(tenantId, {
      status: "idle",
      currentStep: 0,
      totalSteps: 7,
      stepName: "",
      logs: [],
    })
  }
  return migrationState.get(tenantId)!
}

function updateState(tenantId: string, update: Partial<ReturnType<typeof getState>>) {
  const state = getState(tenantId)
  Object.assign(state, update)
  state.logs.push(`[${new Date().toISOString()}] ${update.stepName || ""}`)
}

// ─── GET: Migration Status ───

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: tenantId } = await params
  const state = getState(tenantId)

  // Also get instance info
  const instance = await db.tenantInstance.findUnique({
    where: { tenantId },
    select: {
      id: true,
      deploymentType: true,
      serverHost: true,
      serverPort: true,
      sshUser: true,
      apiEndpoint: true,
      status: true,
      version: true,
      lastHeartbeat: true,
      plan: true,
      licenseKey: true,
      creditsAi: true,
      creditsSms: true,
      creditsVoice: true,
      creditsCalls: true,
      updateWindow: true,
      sshPrivateKey: true,
    },
  })

  return NextResponse.json({
    instance: instance ? {
      ...instance,
      sshPrivateKey: undefined,
      hasSSHKey: !!instance.sshPrivateKey,
    } : null,
    migration: state,
  })
}

// ─── POST: Migration Actions ───

export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: tenantId } = await params
  const body = await request.json()
  const action = body.action as string

  switch (action) {
    case "configure":
      return handleConfigure(tenantId, body)
    case "test-ssh":
      return handleTestSSH(tenantId, body)
    case "preflight":
      return handlePreflight(tenantId)
    case "start-migration":
      return handleStartMigration(tenantId, body)
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}

// ─── Action: Configure Server ───

async function handleConfigure(tenantId: string, body: any) {
  const { serverHost, sshUser, sshPrivateKey, sshPort, apiEndpoint } = body

  // Encrypt the SSH private key
  const encryptedKey = sshPrivateKey ? encrypt(sshPrivateKey) : undefined

  const instance = await db.tenantInstance.upsert({
    where: { tenantId },
    create: {
      tenantId,
      tenantName: body.tenantName || "Unknown",
      tenantSlug: body.tenantSlug || "unknown",
      deploymentType: "single-tenant",
      status: "configuring",
      serverHost,
      serverPort: sshPort || 22,
      sshUser: sshUser || "deploy",
      sshPrivateKey: encryptedKey,
      apiEndpoint,
      internalApiKey: `itc_${crypto.randomUUID().replace(/-/g, "")}`,
    },
    update: {
      serverHost,
      serverPort: sshPort || 22,
      sshUser: sshUser || "deploy",
      ...(encryptedKey && { sshPrivateKey: encryptedKey }),
      ...(apiEndpoint && { apiEndpoint }),
      deploymentType: "single-tenant",
      status: "configuring",
    },
  })

  return NextResponse.json({
    success: true,
    instanceId: instance.id,
    licenseKey: instance.licenseKey,
    internalApiKey: instance.internalApiKey,
  })
}

// ─── Action: Test SSH Connection ───

async function handleTestSSH(tenantId: string, body: any) {
  const instance = await db.tenantInstance.findUnique({
    where: { tenantId },
    select: {
      serverHost: true,
      serverPort: true,
      sshUser: true,
      sshPrivateKey: true,
    },
  })

  if (!instance?.serverHost || !instance?.sshPrivateKey) {
    return NextResponse.json({
      success: false,
      error: "Server not configured. Use 'configure' first.",
    })
  }

  const result = await testSSH(
    instance.serverHost,
    instance.serverPort || 22,
    instance.sshUser || "deploy",
    instance.sshPrivateKey
  )

  return NextResponse.json(result)
}

// ─── Action: Pre-flight Checks ───

async function handlePreflight(tenantId: string) {
  const instance = await db.tenantInstance.findUnique({
    where: { tenantId },
  })

  if (!instance?.id) {
    return NextResponse.json({
      success: false,
      error: "Instance not configured",
    })
  }

  const checks: { name: string; status: "pass" | "fail" | "warn"; detail: string }[] = []

  try {
    // Check 1: SSH connectivity
    const sshResult = await testSSH(
      instance.serverHost!,
      instance.serverPort || 22,
      instance.sshUser || "deploy",
      instance.sshPrivateKey!
    )
    checks.push({
      name: "SSH Connectivity",
      status: sshResult.success ? "pass" : "fail",
      detail: sshResult.success ? sshResult.info || "Connected" : sshResult.error || "Failed",
    })

    if (!sshResult.success) {
      return NextResponse.json({ success: false, checks })
    }

    // Check 2: Docker installed
    const dockerResult = await sshExec(instance.id, "docker --version && docker compose version")
    checks.push({
      name: "Docker Installed",
      status: dockerResult.code === 0 ? "pass" : "fail",
      detail: dockerResult.code === 0 ? (dockerResult.stdout.trim().split("\n")[0] ?? "Docker OK") : "Docker not found",
    })

    // Check 3: Disk space
    const diskResult = await sshExec(instance.id, "df -h / | tail -1 | awk '{print $4, $5}'")
    const [available, usedPct] = (diskResult.stdout.trim() || "").split(" ")
    const usedNum = parseInt(usedPct || "0")
    checks.push({
      name: "Disk Space",
      status: usedNum < 80 ? "pass" : usedNum < 90 ? "warn" : "fail",
      detail: `${available} disponibil (${usedPct} utilizat)`,
    })

    // Check 4: Memory
    const memResult = await sshExec(instance.id, "free -h | head -2 | tail -1 | awk '{print $2, $7}'")
    checks.push({
      name: "Memory",
      status: "pass",
      detail: `Total: ${memResult.stdout.trim().split(" ")[0]}, Available: ${memResult.stdout.trim().split(" ")[1] || "?"}`,
    })

    // Check 5: Ports available
    const portResult = await sshExec(instance.id, "ss -tlnp | grep -E ':80 |:443 |:5432 ' | wc -l")
    const portsInUse = parseInt(portResult.stdout.trim() || "0")
    checks.push({
      name: "Ports (80, 443, 5432)",
      status: portsInUse === 0 ? "pass" : "warn",
      detail: portsInUse === 0 ? "All ports available" : `${portsInUse} ports in use`,
    })

    return NextResponse.json({
      success: checks.every((c) => c.status !== "fail"),
      checks,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      checks,
    })
  }
}

// ─── Action: Start Full Migration ───

async function handleStartMigration(tenantId: string, body: any) {
  const state = getState(tenantId)
  if (state.status === "running") {
    return NextResponse.json({ error: "Migration already in progress" }, { status: 409 })
  }

  const instance = await db.tenantInstance.findUnique({
    where: { tenantId },
  })

  if (!instance?.id) {
    return NextResponse.json({ error: "Instance not configured" }, { status: 400 })
  }

  // Update status to migrating
  await db.tenantInstance.update({
    where: { id: instance.id },
    data: { status: "migrating" },
  })

  // Start migration in background
  runMigration(tenantId, instance.id, body.domain || "").catch((err) => {
    console.error("[Migration] Fatal error:", err)
    updateState(tenantId, {
      status: "failed",
      error: err.message,
      stepName: "Fatal error",
    })
  })

  return NextResponse.json({
    success: true,
    message: "Migration started. Poll GET for status.",
  })
}

// ─── Migration Runner (Background) ───

async function runMigration(tenantId: string, instanceId: string, domain: string) {
  console.log(`[Migration] Starting migration for tenant ${tenantId}, instance ${instanceId}, domain ${domain}`)
  updateState(tenantId, {
    status: "running",
    currentStep: 0,
    startedAt: new Date(),
    logs: [],
  })

  try {
    // Step 1: Export DB
    console.log(`[Migration] Step 1: Exporting DB...`)
    updateState(tenantId, { currentStep: 1, stepName: "Exportare bază de date..." })
    const dumpFile = `/tmp/tenant_${tenantId}.sql`
    await exportTenantDB(tenantId, dumpFile)
    console.log(`[Migration] Step 1: DB exported to ${dumpFile}`)
    updateState(tenantId, { stepName: "✅ DB exportat" })

    // Step 2: Generate Docker Compose + env
    updateState(tenantId, { currentStep: 2, stepName: "Generare configurație Docker..." })
    const instance = await db.tenantInstance.findUnique({ where: { id: instanceId } })
    const composeContent = generateDockerCompose(domain)
    const envContent = generateEnvFile(instance!, domain)
    const nginxContent = generateNginxConfig(domain)
    updateState(tenantId, { stepName: "✅ Configurație generată" })

    // Step 3: Upload files to remote server
    console.log(`[Migration] Step 3: Uploading files...`)
    updateState(tenantId, { currentStep: 3, stepName: "Upload fișiere pe server..." })
    // Resolve home dir (SFTP doesn't expand ~)
    const homeResult = await sshExec(instanceId, "echo $HOME")
    const homeDir = homeResult.stdout.trim() || "/home/frappe"
    const deployDir = `${homeDir}/intraconstruct-erp`
    console.log(`[Migration] Step 3: Deploy dir = ${deployDir}`)
    await sshExec(instanceId, `mkdir -p ${deployDir}`)
    await sshUpload(instanceId, composeContent, `${deployDir}/docker-compose.yml`)
    await sshUpload(instanceId, envContent, `${deployDir}/.env`)
    console.log(`[Migration] Step 3: Files uploaded`)
    updateState(tenantId, { stepName: "✅ Fișiere uploadate" })

    // Step 4: Start Docker stack
    console.log(`[Migration] Step 4: Starting Docker stack...`)
    updateState(tenantId, { currentStep: 4, stepName: "Pornire containere Docker..." })
    // Login to GHCR for private image pull
    const ghcrToken = process.env.GHCR_TOKEN
    if (ghcrToken) {
      await sshExec(instanceId, `echo ${ghcrToken} | docker login ghcr.io -u adriansn526 --password-stdin`)
    }
    const dockerResult = await sshExec(instanceId, `cd ${deployDir} && docker compose pull && docker compose up -d`, { timeout: 180000 })
    console.log(`[Migration] Step 4: Docker result code=${dockerResult.code}, stdout=${dockerResult.stdout.slice(0, 200)}, stderr=${dockerResult.stderr.slice(0, 200)}`)
    // Wait for containers to be healthy
    await new Promise((r) => setTimeout(r, 15000))
    updateState(tenantId, { stepName: "✅ Containere pornite" })

    // Step 5: Upload & import DB dump
    updateState(tenantId, { currentStep: 5, stepName: "Import bază de date..." })
    // Read the dump file and upload
    const { readFile } = await import("fs/promises")
    const dumpContent = await readFile(dumpFile)
    await sshUpload(instanceId, dumpContent, `${deployDir}/tenant_dump.sql`)
    // Run prisma migrate + import
    await sshExec(instanceId, [
      `cd ${deployDir}`,
      "&& docker compose exec -T web npx prisma migrate deploy --schema=/app/packages/db/prisma/schema.prisma",
      `&& docker compose exec -T postgres psql -U agency_os -d intraconstruct_erp < ${deployDir}/tenant_dump.sql`,
    ].join(" "), { timeout: 120000 })
    updateState(tenantId, { stepName: "✅ DB importat" })

    // Step 6: Configure nginx reverse proxy
    updateState(tenantId, { currentStep: 6, stepName: "Configurare Nginx..." })
    await sshUpload(instanceId, nginxContent, `${deployDir}/nginx-${domain}.conf`)
    // Copy nginx config and reload (requires sudo, frappe should have sudoers for nginx)
    await sshExec(instanceId, `sudo cp ${deployDir}/nginx-${domain}.conf /etc/nginx/sites-enabled/${domain}.conf && sudo nginx -t && sudo systemctl reload nginx`)
    updateState(tenantId, { stepName: "✅ Nginx configurat" })

    // Step 7: Health check
    updateState(tenantId, { currentStep: 7, stepName: "Verificare sănătate..." })
    const endpoint = `https://${domain}`
    try {
      const healthRes = await fetch(`${endpoint}/api/internal/license`, {
        signal: AbortSignal.timeout(15000),
      })
      if (healthRes.ok) {
        updateState(tenantId, { stepName: "✅ Instanță funcțională!" })
      } else {
        updateState(tenantId, { stepName: `⚠️ Health check: HTTP ${healthRes.status}` })
      }
    } catch {
      updateState(tenantId, { stepName: "⚠️ Health check timeout — verificați manual" })
    }

    // Mark complete
    await db.tenantInstance.update({
      where: { id: instanceId },
      data: {
        status: "active",
        apiEndpoint: `https://${domain}`,
      },
    })

    updateState(tenantId, {
      status: "completed",
      completedAt: new Date(),
      stepName: "Migrare completă!",
    })
  } catch (error: any) {
    console.error(`[Migration] FAILED for tenant ${tenantId}:`, error.message, error.stack)
    updateState(tenantId, {
      status: "failed",
      error: error.message,
      stepName: `❌ Eroare: ${error.message}`,
    })

    await db.tenantInstance.update({
      where: { id: instanceId },
      data: { status: "failed" },
    })
  }
}

// ─── Export tenant data from shared DB ───

async function exportTenantDB(tenantId: string, outputFile: string) {
  // Tables with tenantId column — export only this tenant's data
  const tenantTables = [
    "Tenant", "TenantUser", "TenantSetting", "BusinessLine",
    "Client", "Project", "Offer", "Contract", "Invoice", "Material",
    "Supplier", "Employee", "WorkLog", "AiUsageLog", "MediaFile",
    "PurchaseOrder", "MaterialRequest", "OfferItem", "ProjectTask",
    "SiteDiary", "ClientSite", "ClientSiteSystem",
  ]

  // Export schema first
  const schemaDumpCmd = `docker exec ${DB_CONTAINER} pg_dump -U ${DB_USER} -d ${DB_NAME} --schema-only --no-owner --no-privileges`
  await execAsync(`${schemaDumpCmd} > ${outputFile}`, { timeout: 30000 })

  // Export data per table with WHERE tenantId
  for (const table of tenantTables) {
    const cmd = `docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -t -A -c "SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='${table}' AND column_name='tenantId')"`
    try {
      const { stdout } = await execAsync(cmd, { timeout: 5000 })
      if (stdout.trim() === "t") {
        const dataCmd = `docker exec ${DB_CONTAINER} pg_dump -U ${DB_USER} -d ${DB_NAME} --data-only --table='"${table}"' --no-owner`
        // We use a copy command with WHERE filter
        const filterCmd = `docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c "\\COPY (SELECT * FROM \\"${table}\\" WHERE \\"tenantId\\" = '${tenantId}') TO STDOUT WITH CSV HEADER"`
        try {
          const { stdout: csvData } = await execAsync(filterCmd, { timeout: 30000 })
          if (csvData.trim()) {
            // Append as COPY command
            const { appendFile } = await import("fs/promises")
            await appendFile(outputFile, `\n-- Data for ${table}\n`)
            // We'll handle CSV import on the remote side
            await appendFile(outputFile, `-- CSV_DATA:${table}\n${csvData}\n-- END_CSV:${table}\n`)
          }
        } catch {
          // Table might be empty or not exist for this tenant
        }
      }
    } catch {
      // Column doesn't exist, skip
    }
  }

  // Also export User records linked via TenantUser
  const userCmd = `docker exec ${DB_CONTAINER} psql -U ${DB_USER} -d ${DB_NAME} -c "\\COPY (SELECT u.* FROM \\"User\\" u INNER JOIN \\"TenantUser\\" tu ON u.id = tu.\\"userId\\" WHERE tu.\\"tenantId\\" = '${tenantId}') TO STDOUT WITH CSV HEADER"`
  try {
    const { stdout: userData } = await execAsync(userCmd, { timeout: 10000 })
    if (userData.trim()) {
      const { appendFile } = await import("fs/promises")
      await appendFile(outputFile, `\n-- CSV_DATA:User\n${userData}\n-- END_CSV:User\n`)
    }
  } catch {
    // No users
  }
}

// ─── Docker Compose Generator ───

function generateDockerCompose(domain: string): string {
  return `# IntraConstruct-ERP — Single-Tenant Production
# Auto-generated by Agency-OS Migration Engine

services:
  postgres:
    image: postgres:16-alpine
    container_name: ic-postgres
    environment:
      POSTGRES_DB: intraconstruct_erp
      POSTGRES_USER: agency_os
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agency_os -d intraconstruct_erp"]
      interval: 10s
      timeout: 5s
      retries: 5

  web:
    image: ghcr.io/adriansn526/intraconstruct-erp:latest
    container_name: ic-web
    ports:
      - "127.0.0.1:3200:3100"
    environment:
      DATABASE_URL: postgresql://agency_os:\${POSTGRES_PASSWORD}@postgres:5432/intraconstruct_erp?schema=public
      AUTH_SECRET: \${AUTH_SECRET}
      AUTH_TRUST_HOST: "true"
      LICENSE_KEY: \${LICENSE_KEY}
      AGENCY_OS_URL: \${AGENCY_OS_URL}
      DEFAULT_TENANT_SLUG: \${DEFAULT_TENANT_SLUG}
      BASE_DOMAIN: ${domain}
      NEXT_PUBLIC_APP_URL: https://${domain}
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

volumes:
  pgdata:
`
}

function generateEnvFile(instance: any, domain: string): string {
  const pgPass = crypto.randomUUID().replace(/-/g, "").slice(0, 24)
  const authSecret = crypto.randomUUID()

  return `# IntraConstruct-ERP — Single-Tenant Environment
# Auto-generated by Agency-OS Migration Engine

POSTGRES_PASSWORD=${pgPass}
AUTH_SECRET=${authSecret}
LICENSE_KEY=${instance.licenseKey}
AGENCY_OS_URL=https://admin.asns.ro
DEFAULT_TENANT_SLUG=${instance.tenantSlug}
APP_VERSION=1.0.0
`
}

function generateNginxConfig(domain: string): string {
  return `# IntraConstruct-ERP — Nginx reverse proxy
# Auto-generated by Agency-OS Migration Engine

server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
`
}
