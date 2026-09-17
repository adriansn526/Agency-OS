import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execFileAsync = promisify(execFile)

// Schema Zod pentru extracția datelor din factură
export const invoiceSchema = z.object({
  supplierName: z.string().describe('Numele complet al furnizorului care a emis factura'),
  amount: z.number().describe('Suma totală FINALĂ de plată de pe factură (inclusiv TVA/taxe). Caută "Total", "Amount due" sau "Grand Total".'),
  currency: z.string().describe('Moneda în care este emisă factura (ex: RON, EUR, USD)'),
  issueDate: z.string().describe('Data emiterii facturii în format YYYY-MM-DD'),
  invoiceNumber: z.string().describe('Numărul facturii (serie și număr sau doar număr)'),
})

export type ExtractedInvoice = z.infer<typeof invoiceSchema>

export async function parsePdfToText(buffer: Buffer): Promise<string> {
  let tempDir = ''
  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'invoice-parse-'))
    const inputPath = path.join(tempDir, 'input.pdf')
    await fs.writeFile(inputPath, buffer)

    // Apelează utilitarul nativ pdftotext (fără layout, doar textul pur pentru facturi)
    const { stdout } = await execFileAsync('pdftotext', [inputPath, '-'])
    return stdout
  } catch (error) {
    console.error('[Parser] Failed to extract text from PDF:', error)
    return ''
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

export async function extractInvoiceData(pdfText: string): Promise<{ data: ExtractedInvoice | null, error?: string }> {
  // Fallback de siguranță: dacă textul e gol sau prea scurt, considerăm că e scan sau corupt
  if (!pdfText || pdfText.trim().length < 100) {
    return { data: null, error: 'OCR_FALLBACK_REQUIRED' }
  }

  try {
    const result = await generateObject({
      model: google('gemini-3.5-flash'),
      schema: invoiceSchema,
      prompt: `
        Extrage următoarele informații din textul acestei facturi:
        - Numele furnizorului emitent (caută "Furnizor", "Vânzător", "Emis de" etc.)
        - Suma totală de plată (ATENȚIE: trebuie să fie suma finală care include taxele/TVA. NU extrage subtotalul. Caută "Total", "Amount due", "Grand Total")
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
