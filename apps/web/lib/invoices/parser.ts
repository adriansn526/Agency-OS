import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import pdfParse from 'pdf-parse'

// Schema Zod pentru extracția datelor din factură
export const invoiceSchema = z.object({
  supplierName: z.string().describe('Numele complet al furnizorului care a emis factura'),
  amount: z.number().describe('Suma totală de plată de pe factură'),
  currency: z.string().describe('Moneda în care este emisă factura (ex: RON, EUR, USD)'),
  issueDate: z.string().describe('Data emiterii facturii în format YYYY-MM-DD'),
  invoiceNumber: z.string().describe('Numărul facturii (serie și număr sau doar număr)'),
})

export type ExtractedInvoice = z.infer<typeof invoiceSchema>

export async function parsePdfToText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer)
    return data.text
  } catch (error) {
    console.error('[Parser] Failed to extract text from PDF:', error)
    return ''
  }
}

export async function extractInvoiceData(pdfText: string): Promise<{ data: ExtractedInvoice | null, error?: string }> {
  // Fallback de siguranță: dacă textul e gol sau prea scurt, considerăm că e scan sau corupt
  if (!pdfText || pdfText.trim().length < 100) {
    return { data: null, error: 'OCR_FALLBACK_REQUIRED' }
  }

  try {
    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: invoiceSchema,
      prompt: `
        Extrage următoarele informații din textul acestei facturi:
        - Numele furnizorului emitent (caută "Furnizor", "Vânzător", "Emis de" etc.)
        - Suma totală de plată
        - Moneda (RON, EUR, USD, etc)
        - Data emiterii facturii (transformă în format YYYY-MM-DD)
        - Numărul facturii (serie și număr)
        
        Text factură:
        ${pdfText}
      `,
    })

    return { data: result.object }
  } catch (error) {
    console.error('[Parser] LLM extraction failed:', error)
    return { data: null, error: 'LLM_EXTRACTION_FAILED' }
  }
}
