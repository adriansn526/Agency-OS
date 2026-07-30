import { NextResponse } from 'next/server'
import { saveConnectedAccount } from '@/lib/integrations/oauth'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

  if (error) {
    return new NextResponse(`OAuth Error: ${error}`, { status: 400 })
  }

  if (!code) {
    return new NextResponse('No code provided', { status: 400 })
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return new NextResponse('Missing Google OAuth credentials', { status: 500 })
  }

  const baseUrl = process.env.AUTH_URL || 'https://admin.asns.ro'
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok) {
      console.error('Token Exchange Error:', tokenData)
      return new NextResponse('Failed to exchange token', { status: 500 })
    }

    // 2. Get user info to know who connected this (and get their providerAccountId)
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })
    const userInfo = await userInfoResponse.json()

    if (!userInfoResponse.ok) {
      return new NextResponse('Failed to fetch user info', { status: 500 })
    }

    // 3. Decode state to get clientId and redirect url
    let clientId: string | undefined = undefined
    let redirectPath = '/settings/integrations'
    
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'))
        if (decoded.clientId) clientId = decoded.clientId
        if (decoded.redirect) redirectPath = decoded.redirect
      } catch (e) {
        console.error('Failed to parse state', e)
      }
    }

    // 4. Save to database
    await saveConnectedAccount({
      provider: 'google',
      providerAccountId: userInfo.id,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token, // might be undefined if not prompt=consent and already granted
      expiresAt: Math.floor(Date.now() / 1000) + tokenData.expires_in,
      email: userInfo.email,
      clientId: clientId || undefined // undefined means master account
    })

    // 5. Redirect back to UI
    return NextResponse.redirect(`${baseUrl}${redirectPath}?integration=success`)

  } catch (error) {
    console.error('OAuth Callback Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
