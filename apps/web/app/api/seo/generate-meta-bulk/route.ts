import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

const schema: any = {
  type: SchemaType.OBJECT,
  properties: {
    results: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.INTEGER },
          title: { type: SchemaType.STRING, description: "Optimized SEO title (50-60 chars)" },
          metaDescription: { type: SchemaType.STRING, description: "Optimized meta description (120-160 chars)" },
          keyword: { type: SchemaType.STRING, description: "The primary focus keyword for this article" }
        },
        required: ["id", "title", "metaDescription", "keyword"]
      }
    }
  },
  required: ["results"]
}

export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 })
    }

    const { articles } = await req.json()

    if (!Array.isArray(articles) || articles.length === 0) {
      return NextResponse.json({ error: 'No articles provided' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    })

    const prompt = `
      You are an expert SEO specialist and direct response copywriter. Analyze the following article drafts and generate optimized SEO metadata for each of them.
      Your goal is to maximize Organic CTR (Click-Through Rate).
      For each article, provide:
      - title: An engaging, click-worthy title optimized for search engines (50-60 characters). Use proven click-bait (ethical) strategies like numbers, brackets, or action words.
      - metaDescription: A compelling meta description that summarizes the article and encourages clicks (120-160 characters). Include a call to action.
      - keyword: The main focus keyword that this article should target (if a Target Keyword is provided below, use it!).

      Articles to process:
      ${articles.map((a: any) => `
        ---
        ID: ${a.id}
        Current Title: ${a.title || 'N/A'}
        ${a.targetKeyword ? `TARGET KEYWORD (MUST OPTIMIZE FOR THIS): ${a.targetKeyword}` : ''}
        Content snippet: ${a.content ? a.content.substring(0, 800) + '...' : 'N/A'}
        ---
      `).join('\n')}
    `

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const parsed = JSON.parse(responseText)
    const usage = result.response.usageMetadata

    return NextResponse.json({ 
      data: parsed.results,
      usage: usage ? {
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount
      } : null
    })
  } catch (error: any) {
    console.error('[API] POST /api/seo/generate-meta-bulk error:', error)
    return NextResponse.json({ error: 'Failed to generate SEO meta', details: error.message }, { status: 500 })
  }
}
