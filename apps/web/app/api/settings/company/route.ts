import { NextRequest, NextResponse } from 'next/server'
import { readSettings, writeSettings } from '../_store'

// ─── GET /api/settings/company ───
// Date prestator (CompanySettings) pentru pre-populare contracte
export async function GET() {
  try {
    const settings = readSettings()

    return NextResponse.json({
      data: settings.company,
    })
  } catch (error) {
    console.error('[API] GET /api/settings/company error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company settings' },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/settings/company ───
// Update date prestator
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const settings = readSettings()

    // Merge updates into existing company settings
    settings.company = {
      ...settings.company,
      ...body,
    }

    writeSettings(settings)

    return NextResponse.json({
      data: settings.company,
    })
  } catch (error) {
    console.error('[API] PATCH /api/settings/company error:', error)
    return NextResponse.json(
      { error: 'Failed to update company settings' },
      { status: 500 }
    )
  }
}
