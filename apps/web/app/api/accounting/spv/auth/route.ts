import { NextRequest, NextResponse } from 'next/server'
import { db } from '@repo/db'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.ANAF_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: 'ANAF_CLIENT_ID nu este configurat în variabilele de mediu.' }, { status: 400 })
    }

    // Generate ANAF Login URL
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.asns.ro'}/api/accounting/spv/callback`
    const anafUrl = new URL('https://logincert.anaf.ro/anaf-oauth2/v1/authorize')
    
    anafUrl.searchParams.append('response_type', 'code')
    anafUrl.searchParams.append('client_id', clientId)
    anafUrl.searchParams.append('redirect_uri', redirectUri)
    anafUrl.searchParams.append('token_content_type', 'jwt')

    return NextResponse.redirect(anafUrl.toString())
  } catch (error) {
    console.error('[SPV Auth GET]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
