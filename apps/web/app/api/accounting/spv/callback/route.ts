import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { encrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    const redirectBackUrl = new URL('/accounting/spv', request.url)

    if (error) {
      console.error('[SPV Callback] ANAF returned error:', error)
      return new NextResponse(`<h1>Eroare ANAF</h1><p>${error}</p>`, { status: 400, headers: { 'Content-Type': 'text/html' } })
    }

    if (!code) {
      return new NextResponse(`<h1>Eroare</h1><p>Cod lipsă din răspunsul ANAF.</p>`, { status: 400, headers: { 'Content-Type': 'text/html' } })
    }

    const tenant = await db.tenantInstance.findFirst()
    if (!tenant) return new NextResponse(`<h1>Eroare</h1><p>Tenant invalid.</p>`, { status: 400, headers: { 'Content-Type': 'text/html' } })

    const clientId = process.env.ANAF_CLIENT_ID
    const clientSecret = process.env.ANAF_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return new NextResponse(`<h1>Eroare Server</h1><p>Lipsesc credențialele din mediu.</p>`, { status: 500, headers: { 'Content-Type': 'text/html' } })
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.asns.ro'}/api/accounting/spv/callback`

    // Exchange Code for Token
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    const tokenResponse = await fetch('https://logincert.anaf.ro/anaf-oauth2/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        token_content_type: 'jwt'
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('[SPV Callback] Token exchange failed:', tokenData)
      return new NextResponse(`<h1>Eroare la schimbul de token</h1><p>${JSON.stringify(tokenData)}</p>`, { status: 400, headers: { 'Content-Type': 'text/html' } })
    }

    // ANAF Token returns: access_token, refresh_token, expires_in (seconds)
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Criptam tokenurile la rest
    const encryptedAccess = encrypt(tokenData.access_token)
    const encryptedRefresh = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null

    await db.anafSettings.upsert({
      where: { tenantId: tenant.id },
      update: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: expiresAt
      },
      create: {
        tenantId: tenant.id,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: expiresAt
      }
    })

    const html = `
      <html>
        <head><title>Conexiune SPV Reușită</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f0fdf4;">
          <h1 style="color: #16a34a;">Conexiune SPV Realizată cu Succes!</h1>
          <p>Autentificarea ANAF a fost realizată, iar tokenul a fost securizat.</p>
          <p>Puteți închide această fereastră și informa administratorul.</p>
        </body>
      </html>
    `
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })

  } catch (error: any) {
    console.error('[SPV Callback GET]', error)
    return new NextResponse(`<h1>Eroare Internă</h1><pre>${error.message}\n${error.stack}</pre>`, { status: 500, headers: { 'Content-Type': 'text/html' } })
  }
}
