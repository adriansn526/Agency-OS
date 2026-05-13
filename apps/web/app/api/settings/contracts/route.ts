import { NextRequest, NextResponse } from 'next/server'
import { readSettings, writeSettings } from '../_store'

// ─── GET /api/settings/contracts ───
// Setări contracte: defaultDuration, numbering per BL, penaltyRate, etc.
export async function GET() {
  try {
    const settings = readSettings()

    return NextResponse.json({
      data: settings.contracts,
    })
  } catch (error) {
    console.error('[API] GET /api/settings/contracts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract settings' },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/settings/contracts ───
// Update setări contracte
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const settings = readSettings()

    // Merge updates — special handling for nested numbering
    const { numbering, ...rest } = body

    settings.contracts = {
      ...settings.contracts,
      ...rest,
    }

    // Merge numbering per BL (don't overwrite all, just update provided keys)
    if (numbering && typeof numbering === 'object') {
      settings.contracts.numbering = {
        ...settings.contracts.numbering,
        ...numbering,
      }
    }

    writeSettings(settings)

    return NextResponse.json({
      data: settings.contracts,
    })
  } catch (error) {
    console.error('[API] PATCH /api/settings/contracts error:', error)
    return NextResponse.json(
      { error: 'Failed to update contract settings' },
      { status: 500 }
    )
  }
}
