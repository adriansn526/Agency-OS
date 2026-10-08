import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/** Admin-only guard for /api/commerce/* routes. Returns a 401/403 response or null when allowed. */
export async function requireCommerceAdmin(): Promise<NextResponse | null> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export function badRequest(message = 'Invalid input') {
  return NextResponse.json({ error: message }, { status: 400 })
}
