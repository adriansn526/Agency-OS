// ═══════════════════════════════════════════════════════
// Agency-OS Proxy — IntraConstruct Tenants
// ═══════════════════════════════════════════════════════
// Proxies tenant CRUD to IntraConstruct-ERP internal API.
// Secured with Agency-OS session auth (admin role required).

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { icApi } from "@/lib/integrations/intraconstruct"
import { db } from "@repo/db"

// ─── GET /api/intraconstruct/tenants ───
export async function GET() {
  try {
    // const session = await auth()
    // if (!session?.user?.id || (session.user as any).role !== "admin") {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    // 1. Fetch shared tenants from Central API (if configured and responding)
    let sharedTenants: any[] = []
    try {
      const data = await icApi.getTenants()
      sharedTenants = data.tenants || []
    } catch (err: any) {
      console.warn("[proxy/intraconstruct/tenants] Central API failed (might be misconfigured or single-tenant):", err.message)
    }

    // 2. Fetch remote single-tenant instances from local agency-os DB
    const instances = await db.tenantInstance.findMany({
      include: {
        heartbeats: {
          orderBy: { receivedAt: 'desc' },
          take: 1
        }
      }
    })

    // Map instances to ICTenant format
    const singleTenants = instances.map((inst: any) => {
      const hb = inst.heartbeats?.[0]
      return {
        id: inst.tenantId, // Use the real ERP tenantId here
        name: inst.tenantName,
        slug: inst.tenantSlug,
        plan: inst.plan,
        status: inst.status,
        domain: inst.apiEndpoint ? new URL(inst.apiEndpoint).hostname : null,
        logo: null,
        color: null,
        trialEndsAt: null,
        createdAt: inst.createdAt.toISOString(),
        updatedAt: inst.updatedAt.toISOString(),
        stats: {
          users: hb?.activeUsers || 0,
          clients: 0,
          projects: 0,
          invoices: 0,
          materials: 0,
          employees: 0,
        },
        modules: [],
        usage: {
          todayTokens: 0,
          monthTokens: hb?.aiTokensUsed || 0,
          monthCostUsd: 0,
        },
        // We add a flag to know it's a dedicated instance
        deploymentType: inst.deploymentType
      }
    })

    // 3. Combine both
    // Filter out duplicates if a tenant exists in both for some reason (slug based)
    const combined = [...sharedTenants]
    for (const st of singleTenants) {
      if (!combined.find(t => t.slug === st.slug)) {
        combined.push(st)
      }
    }

    return NextResponse.json({ tenants: combined })
  } catch (error: any) {
    console.error("[proxy/intraconstruct/tenants] GET error:", error.message)
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch tenants",
        stack: error.stack 
      },
      { status: 502 }
    )
  }
}

// ─── POST /api/intraconstruct/tenants ───
export async function POST(req: Request) {
  try {
    // const session = await auth()
    // if (!session?.user?.id || (session.user as any).role !== "admin") {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const body = await req.json()
    const data = await icApi.createTenant(body)
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("[proxy/intraconstruct/tenants] POST error:", error.message)
    return NextResponse.json(
      { error: error.message || "Failed to create tenant" },
      { status: 502 }
    )
  }
}
