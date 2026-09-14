const pdfParse = require('pdf-parse')

/**
 * Extrage textul din PDF și returnează doar secțiunea care corespunde IBAN-ului specificat.
 */
export async function parsePdfForAccount(buffer: Buffer, accountIban: string): Promise<string> {
  const data = await pdfParse(buffer)
  const fullText = data.text

  // Căutăm secțiuni care încep cu cuvântul "CONT" urmat de alte texte și apoi "IBAN: "
  // Pattern-ul aproximativ: /CONT[\s\S]*?IBAN:\s*(RO[A-Z0-9]+)/ig
  // Vom partiționa textul după aparițiile IBAN-urilor
  
  const chunks: { iban: string, text: string }[] = []
  
  // O logică simplă: despicăm după cuvântul IBAN:
  const splitByIban = fullText.split(/IBAN:\s*/i)
  
  if (splitByIban.length < 2) {
    throw new Error('Cont nerecunoscut: Nu s-a găsit niciun IBAN în document. Verifică manual.')
  }

  // Primul element este textul de dinainte de primul IBAN, deci îl ignorăm
  for (let i = 1; i < splitByIban.length; i++) {
    const chunk = splitByIban[i]
    const match = chunk.match(/^(RO[a-zA-Z0-9]{20})/i)
    if (match) {
      const foundIban = match[1].toUpperCase()
      chunks.push({ iban: foundIban, text: chunk })
    }
  }

  // Căutăm chunk-ul care se potrivește cu IBAN-ul nostru
  const targetChunk = chunks.find(c => c.iban === accountIban.toUpperCase())
  
  if (!targetChunk) {
    throw new Error(`Cont nerecunoscut: IBAN-ul configurat (${accountIban}) nu a fost găsit în extras. Verifică manual IBAN-ul setat.`)
  }

  return targetChunk.text
}
