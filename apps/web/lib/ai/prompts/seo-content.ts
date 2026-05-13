// ─── AI Content Generation Prompts ───
// Template-specific prompts that leverage Brand DNA context for generating content

import type { BrandDNA } from '../brand-dna/types'

/**
 * Builds a brand context block for inclusion in any prompt
 */
function buildBrandContext(brand: Partial<BrandDNA>): string {
  const parts: string[] = []

  if (brand.name) parts.push(`Brand: ${brand.name}`)
  if (brand.tagline) parts.push(`Tagline: ${brand.tagline}`)
  if (brand.industry) parts.push(`Industry: ${brand.industry} (${brand.category || ''})`)
  if (brand.tone) {
    parts.push(`Communication Tone: ${brand.tone.primary}, ${brand.tone.secondary}`)
    parts.push(`Tone Description: ${brand.tone.description}`)
    parts.push(`Formality: ${brand.tone.formality}/100, Energy: ${brand.tone.energy}/100, Warmth: ${brand.tone.warmth}/100`)
  }
  if (brand.audience) {
    parts.push(`Target Audience: ${brand.audience.primary} (secondary: ${brand.audience.secondary})`)
    parts.push(`Age Range: ${brand.audience.ageRange}`)
    if (brand.audience.interests?.length) parts.push(`Interests: ${brand.audience.interests.join(', ')}`)
    if (brand.audience.painPoints?.length) parts.push(`Pain Points: ${brand.audience.painPoints.join(', ')}`)
  }
  if (brand.keywords?.length) parts.push(`Brand Keywords: ${brand.keywords.join(', ')}`)

  return parts.join('\n')
}

export type ContentType =
  | 'seo_article'
  | 'meta_description'
  | 'ad_copy'
  | 'social_caption'
  | 'linkedin_post'
  | 'blog_outline'

export interface GenerateContentInput {
  type: ContentType
  topic: string             // keyword or topic
  brand?: Partial<BrandDNA> // optional Brand DNA context
  platform?: string         // for social: facebook, instagram, tiktok, linkedin
  language?: string         // default: 'ro' (Romanian)
  tone?: string             // override tone
  maxLength?: number        // desired max length in words
}

/**
 * Returns system + user messages for the LLM based on content type.
 */
export function buildContentPrompt(input: GenerateContentInput): {
  system: string
  user: string
  maxTokens: number
  temperature: number
} {
  const brandContext = input.brand ? buildBrandContext(input.brand) : ''
  const lang = input.language || 'ro'
  const langLabel = lang === 'ro' ? 'Romanian' : lang === 'en' ? 'English' : lang

  switch (input.type) {
    case 'seo_article':
      return {
        system: `You are an expert SEO content writer. Write in ${langLabel}. Use the brand context to match the brand's voice and tone. Structure the article with H2/H3 headings, include the target keyword naturally (3-5% density), and write compelling meta descriptions.`,
        user: `${brandContext ? `\n--- BRAND CONTEXT ---\n${brandContext}\n---\n\n` : ''}Write a comprehensive SEO article about: "${input.topic}"

Requirements:
- Length: ${input.maxLength || 1200}-${(input.maxLength || 1200) + 400} words
- Include H2 and H3 subheadings
- Natural keyword integration
- Engaging introduction with hook
- Actionable conclusion with CTA
- Write in ${langLabel}
${input.tone ? `- Tone: ${input.tone}` : ''}

Format the output as markdown.`,
        maxTokens: 4096,
        temperature: 0.7,
      }

    case 'meta_description':
      return {
        system: `You are an SEO specialist. Write compelling meta descriptions in ${langLabel} that drive clicks. Max 155 characters.`,
        user: `${brandContext ? `\n--- BRAND CONTEXT ---\n${brandContext}\n---\n\n` : ''}Write 3 meta description options for a page about: "${input.topic}"

Each should be:
- Maximum 155 characters
- Include the target keyword naturally
- Have a clear call-to-action
- Be compelling and click-worthy
- Write in ${langLabel}

Format: Return each option on a new line, numbered 1-3.`,
        maxTokens: 512,
        temperature: 0.8,
      }

    case 'ad_copy':
      return {
        system: `You are a Google Ads copywriter expert. Create high-converting ad copy in ${langLabel}. Follow Google Ads character limits strictly.`,
        user: `${brandContext ? `\n--- BRAND CONTEXT ---\n${brandContext}\n---\n\n` : ''}Create Google Ads copy for: "${input.topic}"

Generate:
1. **3 Headlines** (max 30 characters each)
2. **2 Long Headlines** (max 90 characters each)
3. **2 Descriptions** (max 90 characters each)
4. **3 Sitelink titles** (max 25 characters each)

Rules:
- Include power words and urgency
- Include a CTA in at least one headline
- Match the brand voice
- Write in ${langLabel}

Format as structured markdown with labels.`,
        maxTokens: 1024,
        temperature: 0.8,
      }

    case 'social_caption':
      return {
        system: `You are a social media content creator specialized in ${input.platform || 'Instagram'}. Write engaging captions in ${langLabel} with relevant hashtags and emojis.`,
        user: `${brandContext ? `\n--- BRAND CONTEXT ---\n${brandContext}\n---\n\n` : ''}Create a ${input.platform || 'Instagram'} post caption about: "${input.topic}"

Requirements:
- Engaging hook in the first line
- Platform-appropriate length (${getPlatformLength(input.platform)})
- Include 5-10 relevant hashtags
- Use emojis strategically
- Include a clear CTA
- Match the brand's tone
- Write in ${langLabel}
${input.tone ? `- Specific tone: ${input.tone}` : ''}`,
        maxTokens: 1024,
        temperature: 0.8,
      }

    case 'linkedin_post':
      return {
        system: `You are a LinkedIn thought leadership content creator. Write professional yet engaging posts in ${langLabel} that drive meaningful engagement and position the brand as an industry leader.`,
        user: `${brandContext ? `\n--- BRAND CONTEXT ---\n${brandContext}\n---\n\n` : ''}Write a LinkedIn post about: "${input.topic}"

Requirements:
- Strong opening hook (first 2 lines are crucial — visible before "see more")
- Professional but conversational tone
- Include 1-2 relevant statistics or insights if applicable
- Short paragraphs (1-2 sentences each)
- End with a question to drive engagement
- 3-5 relevant hashtags at the end
- Length: 800-1200 characters
- Write in ${langLabel}`,
        maxTokens: 1024,
        temperature: 0.7,
      }

    case 'blog_outline':
      return {
        system: `You are a content strategist. Create detailed blog post outlines in ${langLabel} that are SEO-optimized and structured for readability.`,
        user: `${brandContext ? `\n--- BRAND CONTEXT ---\n${brandContext}\n---\n\n` : ''}Create a blog post outline for: "${input.topic}"

Include:
- Suggested title (H1)
- Meta description
- 5-8 main sections (H2) with sub-points (H3)
- Suggested internal/external link opportunities
- Key takeaways
- CTA suggestion
- Estimated word count per section
- Write in ${langLabel}`,
        maxTokens: 2048,
        temperature: 0.6,
      }

    default:
      throw new Error(`Unknown content type: ${input.type}`)
  }
}

function getPlatformLength(platform?: string): string {
  switch (platform) {
    case 'twitter': return 'max 280 characters'
    case 'tiktok': return '100-150 characters'
    case 'facebook': return '300-500 characters'
    case 'linkedin': return '800-1200 characters'
    case 'instagram':
    default: return '300-500 characters, max 2200'
  }
}
