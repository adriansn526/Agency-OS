import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public routes — no auth required
const publicPaths = [
  "/login",
  "/offer",
  "/o/",
  "/contract/view",
  "/s/",              // short link redirects
  "/lp/",             // landing pages
  "/api/auth",
  "/api/offers/public",
  "/api/contracts/public",
  "/api/reports/public",
  "/report/view",
  "/api/leads/webhook",
  "/api/webhooks",          // whatsapp & other future webhooks
  "/api/import",
  "/api/uptime",
  "/api/monitoring",
  "/api/marketing/track",   // LP tracking (open, heartbeat, cta)
  "/api/short-links/resolve",
  "/api/cron",               // Cron jobs (authenticated via CRON_SECRET header)
  "/api/intraconstruct",     // IntraConstruct remote API (authenticated via X-License-Key)
  "/api/accounting/spv/auth",     // Public redirect to ANAF for external accountants
  "/api/accounting/spv/callback", // Public ANAF callback URL
  "/projects",
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isPublic = publicPaths.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // If not authenticated (no session token cookie), redirect to login
  const hasSessionCookie = req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token")
  
  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next|__nextjs_font|__nextjs_original-stack-frame|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js|map)$).*)",
  ],
}
