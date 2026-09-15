import { NextResponse } from 'next/server'
import { db } from '@repo/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const t = await db.tenantInstance.findFirst();
  const c = await db.tenantInstance.count();
  return NextResponse.json({ url: process.env.DATABASE_URL, count: c, tenant: t });
}
