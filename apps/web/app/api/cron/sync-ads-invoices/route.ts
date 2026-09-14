import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { getBillingInvoices } from '@/lib/integrations/google-ads'

export async function GET(request: NextRequest) {
  // Verifică un cron secret (pentru a securiza apelul extern)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // În scenariu real, extragem toți furnizorii Google Ads din db
    // Pentru simplitate, presupunem că avem setat un accountId în setări
    const customerId = process.env.GOOGLE_ADS_MANAGER_ID
    if (!customerId) {
      return NextResponse.json({ error: 'Missing config' }, { status: 400 })
    }

    // Căutăm furnizorul "Google Ireland" sau îl creăm (pentru a avea supplierId)
    // Deoarece rulăm pe mai multe tenants, iterăm tenanții. (Aici simulăm pe primul tenant pt Faza 2)
    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return NextResponse.json({ error: 'No tenant' }, { status: 400 })
    
    let supplier = await db.supplier.findFirst({
      where: { tenantId: tenant.id, name: { contains: 'Google', mode: 'insensitive' } }
    })
    
    if (!supplier) {
      supplier = await db.supplier.create({
        data: {
          tenantId: tenant.id,
          name: 'Google Ireland Limited',
          category: 'Marketing',
          isRecurring: true,
        }
      })
    }

    // Preluăm ultimele 30 zile
    const dateTo = new Date().toISOString().split('T')[0]
    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    const invoices = await getBillingInvoices(customerId, dateFrom as string, dateTo as string)

    let synced = 0
    for (const inv of invoices) {
      // Verificăm unicitate
      const exists = await db.supplierInvoice.findFirst({
        where: { sourceRef: inv.id } // sourceRef is the API Invoice ID
      })

      if (!exists) {
        await db.supplierInvoice.create({
          data: {
            tenantId: tenant.id,
            supplierId: supplier.id,
            amount: inv.amount,
            currency: inv.currency,
            issueDate: new Date(inv.issueDate),
            invoiceNumber: inv.id,
            pdfUrl: inv.pdfUrl || 'https://ads.google.com',
            status: 'paid', // Google Ads are auto-charged usually
            source: 'api',
            sourceRef: inv.id,
            extractionStatus: 'confirmed',
            extractedBy: 'api_native'
          }
        })
        synced++
      }
    }

    return NextResponse.json({ success: true, synced })
  } catch (error) {
    console.error('[CRON] Sync ads invoices error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
