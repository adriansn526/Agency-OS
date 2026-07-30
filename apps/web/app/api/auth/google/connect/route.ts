import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId') || '' // If empty, it's the master agency account
  
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  
  if (!GOOGLE_CLIENT_ID) {
    return new NextResponse('GOOGLE_CLIENT_ID is not configured', { status: 500 })
  }

  // Construct the redirect URI using AUTH_URL to avoid proxy mismatch
  const baseUrl = process.env.AUTH_URL || 'https://admin.asns.ro'
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  // Scopes needed for our integrations
  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly', // Google Search Console
    'https://www.googleapis.com/auth/analytics.readonly', // Google Analytics Data
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ')

  // We use "state" to pass the clientId so we know which client we are connecting when Google redirects back
  const state = Buffer.from(JSON.stringify({ clientId, redirect: '/settings/integrations' })).toString('base64')

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID)
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.append('response_type', 'code')
  googleAuthUrl.searchParams.append('scope', scopes)
  googleAuthUrl.searchParams.append('access_type', 'offline') // Important: this gives us the refresh token!
  googleAuthUrl.searchParams.append('prompt', 'consent') // Force consent screen to always get a refresh token
  googleAuthUrl.searchParams.append('state', state)

  return NextResponse.redirect(googleAuthUrl.toString())
}
