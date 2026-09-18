import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { generateAndSendAccountingPackage } from '@/lib/accounting/packager'
import { subMonths, format } from 'date-fns'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET || 'local_cron'}`) {
    // Permitem pentru teste rapide dar ideal adaugam CRON_SECRET in env
  }

  try {
    const today = new Date()
    const currentDay = today.getDate()

    // Găsim toți tenanții care au optat pentru trimitere automată
    const activeSettings = await db.accountingSettings.findMany({
      where: {
        validTo: null,
        autoSendEnabled: true,
        autoSendDay: currentDay
      }
    })

    if (activeSettings.length === 0) {
      return NextResponse.json({ message: 'Niciun pachet de trimis automat azi.', status: 'SKIPPED' })
    }

    // Luna anterioară (dacă azi e 5 sept, trimitem pt luna august)
    const lastMonthDate = subMonths(today, 1)
    const monthStr = format(lastMonthDate, 'yyyy-MM')

    let sent = 0
    let failed = 0

    for (const setting of activeSettings) {
      try {
        await generateAndSendAccountingPackage({
          tenantId: setting.tenantId,
          month: monthStr,
          skipValidation: true, // Cron-ul ignoră facturile în pending
          sentBy: 'cron-system'
        })
        sent++
      } catch (err: any) {
        console.error(`[Cron SendAccounting] Eroare pentru tenant ${setting.tenantId}:`, err)
        failed++
      }
    }

    return NextResponse.json({ 
      success: true, 
      status: 'PROCESSED',
      message: `Trimise: ${sent}, Eșuate: ${failed}` 
    })

  } catch (error) {
    console.error('[Cron SendAccounting] Eroare generală:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
