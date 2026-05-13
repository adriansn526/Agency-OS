import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/google-ads/callback?code=XXXXX
 * 
 * OAuth callback that exchanges the authorization code for a refresh token.
 * Displays the refresh token on screen.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return new NextResponse(`
      <html><body style="font-family:system-ui;padding:40px;background:#111;color:#fff">
        <h1 style="color:#f44">❌ Eroare OAuth</h1>
        <p>${error}</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }

  if (!code) {
    return new NextResponse(`
      <html><body style="font-family:system-ui;padding:40px;background:#111;color:#fff">
        <h1 style="color:#f44">❌ Cod lipsă</h1>
        <p>Nu s-a primit codul de autorizare.</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
        redirect_uri: 'https://admin.asns.ro/api/auth/google-ads/callback',
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      return new NextResponse(`
        <html><body style="font-family:system-ui;padding:40px;background:#111;color:#fff">
          <h1 style="color:#f44">❌ Eroare Token</h1>
          <p>${tokens.error}: ${tokens.error_description}</p>
        </body></html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    const refreshToken = tokens.refresh_token || 'Nu s-a generat refresh token (prompt=consent necesar)';

    return new NextResponse(`
      <html><body style="font-family:system-ui;padding:40px;background:#111;color:#fff;max-width:800px;margin:0 auto">
        <h1 style="color:#4caf50">✅ Refresh Token Generat!</h1>
        <p style="color:#888">Copiază token-ul de mai jos și adaugă-l în <code>.env.local</code></p>
        <div style="background:#222;border:1px solid #333;border-radius:8px;padding:16px;margin:16px 0;word-break:break-all">
          <code style="color:#4fc3f7;font-size:14px">${refreshToken}</code>
        </div>
        <p style="color:#888;font-size:12px">⚠️ Închide pagina după ce ai copiat token-ul.</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } });
  } catch (err: any) {
    return new NextResponse(`
      <html><body style="font-family:system-ui;padding:40px;background:#111;color:#fff">
        <h1 style="color:#f44">❌ Eroare</h1>
        <p>${err.message}</p>
      </body></html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }
}
