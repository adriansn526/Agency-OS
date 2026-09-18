import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const currentSettings = await db.accountingSettings.findFirst({
      where: { 
        tenantId: tenant.id,
        validTo: null
      }
    })

    return NextResponse.json({ data: currentSettings })

  } catch (error) {
    console.error('[AccountingSettings GET]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

    const body = await request.json()
    const { taxRegime, taxRate, isVatPayer, defaultVatRate, accountantEmail, autoSendEnabled, autoSendDay } = body

    if (!accountantEmail) {
      return NextResponse.json({ error: 'Accountant email is required' }, { status: 400 })
    }

    // Istoricizare logică într-o tranzacție (ACID)
    const newSettings = await db.$transaction(async (tx) => {
      // 1. Închidem setarea veche activă
      await tx.accountingSettings.updateMany({
        where: { tenantId: tenant.id, validTo: null },
        data: { validTo: new Date() }
      })

      // 2. Creăm rândul nou cu noile limite (care devine automat validTo: null)
      return tx.accountingSettings.create({
        data: {
          tenantId: tenant.id,
          accountantEmail,
          taxRegime,
          taxRate,
          isVatPayer,
          defaultVatRate,
          autoSendEnabled: autoSendEnabled === true || autoSendEnabled === 'true',
          autoSendDay: autoSendDay ? parseInt(autoSendDay.toString(), 10) : 5
        }
      })
    })

    return NextResponse.json({ success: true, data: newSettings })

  } catch (error) {
    console.error('[AccountingSettings POST]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
