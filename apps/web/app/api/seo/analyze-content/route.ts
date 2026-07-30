import { NextRequest, NextResponse } from "next/server"
import { analyzeHtmlContent } from "@/lib/seo/page-analyzer"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { html, title, metaDescription, keyword, targetKeywords, gscKeywords, existingPostTitles } = body
    
    let keywordsArray: string[] = []
    if (targetKeywords && Array.isArray(targetKeywords)) {
      keywordsArray = targetKeywords
    } else if (keyword) {
      keywordsArray = keyword.split(',').map((k: string) => k.trim()).filter(Boolean)
    }

    if (!html) {
      return NextResponse.json({ error: "Missing HTML content" }, { status: 400 })
    }

    const analysis = analyzeHtmlContent(html, title || "", metaDescription || "", keywordsArray, gscKeywords, existingPostTitles)

    return NextResponse.json({ data: analysis })
  } catch (error: any) {
    console.error("SEO content analysis error:", error)
    return NextResponse.json(
      { error: "Failed to analyze content", details: error.message },
      { status: 500 }
    )
  }
}
