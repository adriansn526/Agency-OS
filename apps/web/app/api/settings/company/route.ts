import { NextResponse } from 'next/server'
import { db } from '@repo/db'

const tenantId = "default-tenant";

export async function GET() {
  try {
    const settings = await db.companySettings.findUnique({
      where: { tenantId }
    })

    if (!settings) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({ data: settings })
  } catch (error) {
    console.error('[API] GET /api/settings/company error:', error)
    return NextResponse.json({ error: 'Failed to fetch company settings' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    
    // Simplistic validation / extraction
    const payload = {
      name: body.name,
      legalName: body.legalName,
      regCom: body.regCom,
      cif: body.cif,
      address: body.address,
      iban: body.iban,
      bank: body.bank,
      representative: body.representative,
      representativeRole: body.representativeRole,
      email: body.email,
      phone: body.phone,
      website: body.website,
      contractsConfig: body.contractsConfig,
      integrationsConfig: body.integrationsConfig,
    }

    const updated = await db.companySettings.upsert({
      where: { tenantId },
      update: payload,
      create: { ...payload, tenantId } as any, // fallback if not exists
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[API] PATCH /api/settings/company error:', error)
    return NextResponse.json({ error: 'Failed to update company settings' }, { status: 500 })
  }
}
