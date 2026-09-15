import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execFileAsync = promisify(execFile)

/**
 * Extrage textul din PDF și returnează doar secțiunea care corespunde IBAN-ului specificat.
 */
export async function parsePdfForAccount(buffer: Buffer, accountIban: string, password?: string): Promise<string> {
  let tempDir: string | null = null
  let fullText = ''

  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfparse-'))
    const inputPath = path.join(tempDir, 'input.pdf')
    await fs.writeFile(inputPath, buffer)

    // Extrage textul nativ cu pdftotext
    const args = ['-layout']
    if (password) {
      args.push('-upw', password)
    }
    args.push(inputPath, '-')

    const { stdout } = await execFileAsync('pdftotext', args)
    fullText = stdout || ''
  } catch (err) {
    throw new Error('Eroare la extragerea textului cu pdftotext: ' + (err as Error).message)
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
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
    if (!chunk) continue
    
    // Permite spații, newline-uri sau alte caractere invizibile înainte de RO
    const match = chunk.match(/^\s*(RO[a-zA-Z0-9]{20})/i)
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
