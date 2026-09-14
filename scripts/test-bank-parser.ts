import { parsePdfForAccount } from '../apps/web/lib/bank/parser'

async function main() {
  const mockPdfText = `
BANCA TRANSILVANIA
Data extras: 14.09.2026

CONT CURENT IBAN: RO12BTRL0000000000000001
Data 10.09.2026 Plata catre Google Ireland 100 RON
Data 11.09.2026 Plata comision lunar 5 RON

CONT DE ECONOMII IBAN: RO99BTRL0000000000000099
Data 12.09.2026 Dobanda incasata 1 RON
`

  // Monkey-patch correctly
  const mod = require('module');
  const originalRequire = mod.prototype.require;
  mod.prototype.require = function(path: string) {
    if (path === 'pdf-parse') {
      return async () => ({ text: mockPdfText });
    }
    return originalRequire.apply(this, arguments);
  };

  console.log("=== Test 1: Cont Valid ===")
  try {
    const chunk1 = await parsePdfForAccount(Buffer.from('mock'), 'RO12BTRL0000000000000001')
    console.log("Success! Found text:", chunk1.substring(0, 50).trim() + "...")
  } catch (e) {
    console.error("Failed:", e)
  }

  console.log("\n=== Test 2: Cont Invalid (Eroare IBAN lipsă) ===")
  try {
    const chunk2 = await parsePdfForAccount(Buffer.from('mock'), 'RO00BTRL0000000000000000')
    console.log("Failed: Should not succeed, but found:", chunk2)
  } catch (e: any) {
    console.error("Success Expected Error:", e.message)
  }
}

main().catch(console.error)
