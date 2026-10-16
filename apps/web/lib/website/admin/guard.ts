import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

/** Admin-only guard for /api/website/* (same rule as Commerce): returns a 401/403 response or null when allowed. */
export async function requireWebsiteAdmin(): Promise<NextResponse | null> {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}
