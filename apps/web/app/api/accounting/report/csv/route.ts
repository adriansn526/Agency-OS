import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { endOfMonth, startOfMonth, parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    
    if (!month) {
      return NextResponse.json({ error: 'Missing month parameter (YYYY-MM)' }, { status: 400 })
    }

    let tenantId = request.headers.get('x-tenant-id')
    if (!tenantId || tenantId === 'default_tenant') {
      const t = await db.tenantInstance.findFirst()
      tenantId = t ? t.id : 'default_tenant'
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 })
    }

    const startDate = startOfMonth(parseISO(`${month}-01`))
    const endDate = endOfMonth(startDate)

    // Aducem facturile confirmate pentru luna respectivă
    const invoices = await db.supplierInvoice.findMany({
      where: { 
        tenantId, 
        issueDate: { gte: startDate, lte: endDate }, 
        extractionStatus: 'confirmed' 
      },
      include: { supplier: true },
      orderBy: { issueDate: 'asc' }
    })

    if (invoices.length === 0) {
      return NextResponse.json({ error: 'Nu există facturi confirmate pentru această lună.' }, { status: 404 })
    }

    // Construim header-ul CSV
    const headers = [
      'Data Emitere',
      'Furnizor',
      'CUI Furnizor',
      'Nr. Factură',
      'Total (Brut)',
      'Monedă',
      'Total Net',
      'Valoare TVA',
      'Categorie Cheltuială',
      '% Deductibilitate Cheltuială',
      'Sumă Deductibilă Cheltuială',
      '% Deductibilitate TVA',
      'Sumă Deductibilă TVA',
      'Status Plată'
    ]

    let csvContent = headers.map(h => `"${h}"`).join(',') + '\n'

    // Iterăm și formatăm liniile
    for (const inv of invoices) {
      const supName = inv.supplier?.name || inv.extractedSupplierName || 'Necunoscut'
      const cui = inv.supplier?.cui || '-'
      
      const dateStr = inv.issueDate.toISOString().split('T')[0]
      const nrFactura = inv.invoiceNumber || '-'
      const totalBrut = Number(inv.amount || 0).toFixed(2)
      const moneda = inv.currency
      const totalNet = Number(inv.netAmount || 0).toFixed(2)
      const valoareTva = Number(inv.vatAmount || 0).toFixed(2)
      const categorie = inv.expenseCategory || '-'
      
      const dedCheltuialaPct = inv.expenseDeductiblePercent ? Number(inv.expenseDeductiblePercent) : 0
      const dedCheltuialaVal = (Number(inv.netAmount || 0) * (dedCheltuialaPct / 100)).toFixed(2)
      
      const dedTvaPct = inv.vatDeductiblePercent ? Number(inv.vatDeductiblePercent) : 0
      const dedTvaVal = (Number(inv.vatAmount || 0) * (dedTvaPct / 100)).toFixed(2)
      
      let status = 'Neplătit'
      if (inv.status === 'paid') status = 'Plătit'
      else if (inv.status === 'partial') status = 'Plătit Parțial'

      const row = [
        dateStr,
        supName,
        cui,
        nrFactura,
        totalBrut,
        moneda,
        totalNet,
        valoareTva,
        categorie,
        `${dedCheltuialaPct}%`,
        dedCheltuialaVal,
        `${dedTvaPct}%`,
        dedTvaVal,
        status
      ]

      csvContent += row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',') + '\n'
    }

    // Adăugăm UTF-8 BOM pentru ca Excel să recunoască corect diacriticele
    const BOM = '\uFEFF'
    const csvWithBom = BOM + csvContent

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Raport-Contabilitate-${month}.csv"`
      }
    })

  } catch (error) {
    console.error('[API] GET /api/accounting/report/csv error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
