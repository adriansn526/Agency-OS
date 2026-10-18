/** Shared plumbing of the /api/storefront/website/partner/* routes (server-to-server, ws_ key plus the partner's session token). */
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { websiteHandler, type WebsiteContext } from '../storefront/auth'
import { AdminError } from '../admin/errors'
import { sessionEntry } from './auth'

export const SESSION_HEADER = 'x-partner-session'
const headers = { 'Cache-Control': 'no-store' }
export const jsonOut = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })

type Entry = NonNullable<Awaited<ReturnType<typeof sessionEntry>>>

/** Handler that needs a valid partner session; maps validation and admin errors to JSON statuses. */
export function partnerHandler<P = Record<string, string>>(fn: (req: Request, ctx: WebsiteContext & { entry: Entry; sessionToken: string }, params: P) => Promise<unknown>) {
  return websiteHandler<P>(async (req, ctx, params) => {
    const sessionToken = req.headers.get(SESSION_HEADER) ?? ''
    const entry = await sessionEntry(ctx.businessLineId, sessionToken)
    if (!entry) return jsonOut({ error: 'unauthenticated' }, 401)
    try {
      const out = await fn(req, { ...ctx, entry, sessionToken }, params)
      return out instanceof Response ? out : jsonOut(out)
    } catch (e) {
      if (e instanceof AdminError) return jsonOut({ error: e.message, details: e.details }, e.status)
      if (e instanceof ZodError) return jsonOut({ error: 'invalid' }, 422)
      throw e
    }
  })
}
