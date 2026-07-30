import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildContentPrompt } from "@/lib/ai/prompts/seo-content"

export const maxDuration = 60 // Allow 60s for article generation

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 })
    }

    const body = await req.json()
    const { keyword, currentHtml, missingGsc, missingLsi, targetWordCount } = body

    if (!keyword || !currentHtml) {
      return NextResponse.json({ error: "Missing keyword or currentHtml" }, { status: 400 })
    }

    // Call AI to optimize article
    const promptConfig = buildContentPrompt({
      type: 'seo_auto_optimizer',
      topic: keyword,
      currentHtml,
      missingGsc,
      missingLsi,
      targetWordCount,
      language: 'ro'
    })

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      systemInstruction: promptConfig.system,
      generationConfig: {
        temperature: promptConfig.temperature,
        maxOutputTokens: promptConfig.maxTokens,
      }
    })

    const result = await model.generateContent(promptConfig.user)
    const text = result.response.text()

    if (!text) {
      throw new Error("No content generated")
    }

    // Process markdown to basic HTML if the output is markdown.
    let htmlContent = text
      // Strip markdown code blocks if the AI ignored instructions
      .replace(/^```html\s*([\s\S]*?)```$/gm, '$1')
      .replace(/^```\s*([\s\S]*?)```$/gm, '$1')

    return NextResponse.json({ 
      data: {
        html: htmlContent,
      },
      usage: {
        promptTokens: result.response.usageMetadata?.promptTokenCount || 0,
        completionTokens: result.response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: result.response.usageMetadata?.totalTokenCount || 0
      }
    })

  } catch (error: any) {
    console.error("[API] POST /api/seo/auto-optimize error:", error)
    return NextResponse.json({ error: "Failed to optimize content", details: error.message }, { status: 500 })
  }
}
