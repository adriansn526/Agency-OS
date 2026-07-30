import { NextRequest, NextResponse } from 'next/server'
import { readSettings, writeSettings } from '../_store'
import { testConnection, resetSMSOCache } from '@/lib/integrations/smso'
import { resetLLMCache } from '@/lib/ai/client'
import { db } from '@repo/db'

// ─── GET /api/settings/integrations ───
export async function GET() {
  try {
    const settings = readSettings()
    // Mask API key for security
    const integrations = { ...settings.integrations }
    if (integrations.smso?.apiKey) {
      integrations.smso = {
        ...integrations.smso,
        apiKey: integrations.smso.apiKey.slice(0, 6) + '***',
      }
    }
    if (integrations.ai?.apiKey) {
      integrations.ai = {
        ...integrations.ai,
        apiKey: integrations.ai.apiKey.slice(0, 6) + '***',
      }
    }

    // Fetch DB integrations
    const googleAcc = await db.connectedAccount.findFirst({ where: { provider: 'google', clientId: null } })
    const posthogAcc = await db.connectedAccount.findFirst({ where: { provider: 'posthog', clientId: null } })

    const dbIntegrations = {
      google: googleAcc ? { connected: true, email: googleAcc.email } : { connected: false },
      posthog: posthogAcc ? { connected: true, hasKey: true } : { connected: false, hasKey: false }
    }

    return NextResponse.json({ data: { ...integrations, ...dbIntegrations } })
  } catch (error) {
    console.error('[API] GET /api/settings/integrations error:', error)
    return NextResponse.json({ error: 'Failed to fetch integration settings' }, { status: 500 })
  }
}

// ─── PATCH /api/settings/integrations ───
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const settings = readSettings()

    if (body.smso) {
      settings.integrations.smso = {
        apiKey: body.smso.apiKey || settings.integrations.smso?.apiKey || '',
        sender: body.smso.sender || settings.integrations.smso?.sender,
        enabled: body.smso.enabled ?? settings.integrations.smso?.enabled ?? true,
      }
      resetSMSOCache()
    }

    if (body.ai) {
      settings.integrations.ai = {
        provider: body.ai.provider || settings.integrations.ai?.provider || 'gemini',
        apiKey: body.ai.apiKey || settings.integrations.ai?.apiKey || '',
        model: body.ai.model || settings.integrations.ai?.model,
        enabled: body.ai.enabled ?? settings.integrations.ai?.enabled ?? true,
      }
      resetLLMCache()
    }

    writeSettings(settings)

    // Save PostHog API Key
    if (body.posthog?.apiKey) {
      const { saveConnectedAccount } = await import('@/lib/integrations/oauth')
      await saveConnectedAccount({
        provider: 'posthog',
        providerAccountId: 'master',
        accessToken: body.posthog.apiKey,
        clientId: undefined
      })
    } else if (body.posthog?.disconnect) {
      await db.connectedAccount.deleteMany({ where: { provider: 'posthog', clientId: null } })
    }

    // Disconnect Google
    if (body.google?.disconnect) {
      await db.connectedAccount.deleteMany({ where: { provider: 'google', clientId: null } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] PATCH /api/settings/integrations error:', error)
    return NextResponse.json({ error: 'Failed to update integrations' }, { status: 500 })
  }
}

// ─── POST /api/settings/integrations ── Test connection ───
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { provider } = body

    if (provider === 'smso') {
      const settings = readSettings()
      const apiKey = body.apiKey || settings.integrations.smso?.apiKey
      
      if (!apiKey) {
        return NextResponse.json({ error: 'No API key provided' }, { status: 400 })
      }

      const result = await testConnection(apiKey)
      return NextResponse.json({ data: result })
    }

    if (provider === 'ai') {
      const settings = readSettings()
      const aiProvider = body.provider || settings.integrations.ai?.provider || 'gemini'
      const apiKey = body.apiKey || settings.integrations.ai?.apiKey

      if (!apiKey) {
        return NextResponse.json({ error: 'No API key provided' }, { status: 400 })
      }

      try {
        // Quick test — generate a simple response
        const { generateText } = await import('@/lib/ai/client')
        const result = await generateText(
          [{ role: 'user', content: 'Say "OK" in one word.' }],
          { maxTokens: 10, temperature: 0 }
        )
        return NextResponse.json({ data: { success: true, provider: aiProvider, response: result.trim() } })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Connection failed'
        return NextResponse.json({ data: { success: false, error: msg } })
      }
    }

    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  } catch (error) {
    console.error('[API] POST /api/settings/integrations error:', error)
    return NextResponse.json({ error: 'Connection test failed' }, { status: 500 })
  }
}
