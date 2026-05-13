import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/google-ads/authorize
 * 
 * Redirects to Google OAuth to get a new refresh token
 * for Google Ads API access.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_ADS_CLIENT_ID not set' }, { status: 500 });
  }

  const redirectUri = `https://admin.asns.ro/api/auth/google-ads/callback`;
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/adwords');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  return NextResponse.redirect(authUrl.toString());
}
