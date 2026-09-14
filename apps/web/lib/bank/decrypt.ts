import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

const execFileAsync = promisify(execFile)

/**
 * Decriptează un buffer PDF folosind utilitarul qpdf și o parolă.
 * Rulează securizat folosind execFile, cu fișiere temporare izolate și șterse garantat.
 */
export async function decryptPdf(inputBuffer: Buffer, password: string): Promise<Buffer> {
  let tempDir: string | null = null
  let inputPath = ''
  let outputPath = ''

  try {
    // 1. Creează director temporar securizat
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'qpdf-'))
    // Ne asigurăm că doar procesul curent are access la director
    await fs.chmod(tempDir, 0o700)

    inputPath = path.join(tempDir, 'input.pdf')
    outputPath = path.join(tempDir, 'output.pdf')

    // 2. Scrie bufferul criptat
    await fs.writeFile(inputPath, inputBuffer, { mode: 0o600 })

    // 3. Apelează qpdf via execFile pentru a evita command injection
    // qpdf --password=<parola> --decrypt input.pdf output.pdf
    await execFileAsync('qpdf', [
      `--password=${password}`,
      '--decrypt',
      inputPath,
      outputPath
    ])

    // 4. Citește bufferul decriptat
    const decryptedBuffer = await fs.readFile(outputPath)
    return decryptedBuffer

  } catch (error) {
    console.error('[BankDecrypt] Eroare la decriptarea PDF-ului:', error)
    throw new Error('PDF Decryption failed')
  } finally {
    // 5. Curățare garantată a fișierelor temporare și a directorului
    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch (cleanupError) {
        console.error('[BankDecrypt] Eroare la ștergerea fișierelor temporare:', cleanupError)
      }
    }
  }
}
