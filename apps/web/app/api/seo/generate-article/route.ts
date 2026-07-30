import { NextRequest, NextResponse } from "next/server"
import { generateWithAI } from "@/lib/ai/gemini"
import { buildContentPrompt } from "@/lib/ai/prompts/seo-content"

export const maxDuration = 60 // Allow 60s for article generation

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { keyword, length, title } = body

    if (!keyword) {
      return NextResponse.json({ error: "Missing keyword" }, { status: 400 })
    }

    const maxLength = length ? parseInt(length, 10) : 1500
    const targetTitle = title ? title : `Articol optimizat pentru: ${keyword}`

    // Call AI to generate article
    const promptConfig = buildContentPrompt({
      type: 'seo_article',
      topic: targetTitle,
      maxLength: maxLength,
      language: 'ro'
    })

    const generation = await generateWithAI([
      { role: "system", content: promptConfig.system },
      { role: "user", content: promptConfig.user }
    ], {
      temperature: promptConfig.temperature,
      maxTokens: promptConfig.maxTokens,
    })

    if (!generation.text) {
      throw new Error("No content generated")
    }

    // Process markdown to basic HTML if the output is markdown.
    let htmlContent = generation.text
      // Convert H2
      .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
      // Convert H3
      .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Lists (simple conversion)
      .replace(/^\-\s+(.*)$/gm, '<li>$1</li>')
      // Wrap list items in ul
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      // Paragraphs
      .split('\\n\\n').map((p: string) => {
        if (!p.startsWith('<h') && !p.startsWith('<ul') && p.trim().length > 0) {
          return `<p>${p.trim()}</p>`
        }
        return p
      }).join('\\n')

    // Extract first H1/H2 as title if any
    const titleMatch = generation.text.match(/^#\s+(.*)$/m)
    const generatedTitle = titleMatch ? titleMatch[1] : targetTitle

    // Generate meta description
    const metaPrompt = buildContentPrompt({
      type: 'meta_description',
      topic: generatedTitle,
      language: 'ro'
    })
    
    const metaGeneration = await generateWithAI([
      { role: "system", content: metaPrompt.system },
      { role: "user", content: metaPrompt.user }
    ], {
      temperature: metaPrompt.temperature,
      maxTokens: metaPrompt.maxTokens,
    })

    let generatedMeta = metaGeneration.text?.split('\\n')[0]?.replace(/^1\.\s*/, '')?.replace(/["']/g, '') || ''
    if (generatedMeta.length > 160) {
      generatedMeta = generatedMeta.substring(0, 157) + '...'
    }

    return NextResponse.json({ 
      data: {
        title: generatedTitle,
        html: htmlContent,
        metaDescription: generatedMeta,
        keyword: keyword,
        markdown: generation.text
      },
      usage: generation.usage
    })
  } catch (error: any) {
    console.error("[API] POST /api/seo/generate-article error:", error)
    return NextResponse.json(
      { error: "Failed to generate article", details: error.message },
      { status: 500 }
    )
  }
}
