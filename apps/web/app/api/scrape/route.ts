import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        'Accept': 'text/plain',
      }
    })

    if (!response.ok) {
      throw new Error(`Jina AI returned ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    
    return NextResponse.json({ content: text })
  } catch (error: any) {
    console.error('Scrape error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
