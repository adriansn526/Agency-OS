import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public routes — no auth required
const publicPaths = [
  "/login",
  "/offer",
  "/contract/view",
  "/s/",              // short link redirects
  "/lp/",             // landing pages
  "/api/auth",
  "/api/offers/public",
  "/api/contracts/public",
  "/api/leads/webhook",
  "/api/import",
  "/api/uptime",
  "/api/marketing/track",   // LP tracking (open, heartbeat, cta)
  "/api/short-links/resolve",
  "/api/cron",               // Cron jobs (authenticated via CRON_SECRET header)
]

const authMiddleware = auth((req) => {
  const { pathname } = req.nextUrl

  const isPublic = publicPaths.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // If not authenticated, redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export default function middleware(req: NextRequest) {
  // Bypass auth entirely for uptime API (cron calls without session)
  if (req.nextUrl.pathname.startsWith("/api/uptime")) {
    return NextResponse.next()
  }
  return (authMiddleware as any)(req)
}

export const config = {
  matcher: [
    "/((?!_next|__nextjs_font|__nextjs_original-stack-frame|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|css|js|map)$).*)",
  ],
}
