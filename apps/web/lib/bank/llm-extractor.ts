import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export const transactionSchema = z.object({
  transactions: z.array(z.object({
    date: z.string().describe('Data tranzacției (YYYY-MM-DD)'),
    description: z.string().describe('Descrierea completă din extras'),
    merchantName: z.string().describe('Numele normalizat al comerciantului/furnizorului. Lăsați gol dacă e comision bancar.'),
    amount: z.number().describe('Suma tranzacției în valoare absolută'),
    type: z.enum(['debit', 'credit']).describe('Dacă sunt bani ieșiți din cont (debit) sau încasați (credit)'),
    category: z.enum([
      'supplier_payment', 
      'bank_fee', 
      'internal_transfer', 
      'legal_payment', 
      'incoming_payment'
    ]).describe('Categoria tranzacției'),
    confidence: z.number().min(0).max(100).describe('Încrederea în extragerea numelui comerciantului (0-100)')
  }))
})

export type ExtractedTransaction = z.infer<typeof transactionSchema>['transactions'][0]

/**
 * Trimite un calup de text din extras (cu liniile de tranzacții) către LLM pentru a structura datele
 */
export async function extractTransactionsFromText(textChunk: string): Promise<ExtractedTransaction[]> {
  try {
    const result = await generateObject({
      model: openai('gpt-4o'),
      schema: transactionSchema,
      prompt: `
        Extrage tranzacțiile financiare din următorul text provenit dintr-un extras de cont bancar.
        
        Pentru fiecare tranzacție, identifică:
        - Data (transformă în format YYYY-MM-DD)
        - Suma și tipul (debit pentru ieșiri, credit pentru încasări)
        - Numele normalizat al furnizorului (merchantName). De exemplu dacă scrie "Plata factura eMAG IT RESEARCH SRL", merchantName este "eMAG IT RESEARCH SRL".
        - Categoria tranzacției:
          - supplier_payment: plăți către furnizori, comercianți, abonamente.
          - bank_fee: comisioane bancare, taxe de administrare.
          - internal_transfer: transferuri între conturile proprii.
          - legal_payment: plăți taxe și impozite stat, popriri.
          - incoming_payment: încasări de la clienți.
        - Încrederea ta (0-100) că ai extras corect numele comerciantului. Dacă e bank_fee, poți pune confidence mic și merchantName gol.
        
        Text Extras:
        ${textChunk}
      `,
    })

    return result.object.transactions
  } catch (error) {
    console.error('[LLMExtractor] Failed to extract transactions:', error)
    return []
  }
}
