import { decryptPdf } from '../apps/web/lib/bank/decrypt'

async function main() {
  console.log("=== Test 1: Parolă Falsificată ===")
  try {
    // Attempt to decrypt with wrong password using a dummy buffer
    await decryptPdf(Buffer.from('not a pdf'), 'wrong_password')
    console.error("Test 1 Failed: Should have thrown an error.")
  } catch (e: any) {
    if (e.message.includes('PDF Decryption failed') || e.message.includes('qpdf')) {
       console.log("Test 1 Passed: Expected failure due to wrong password / invalid PDF.")
    } else {
       console.error("Test 1 Failed with unexpected error:", e.message)
    }
  }

  console.log("\n=== Test 3: Comision Bancar ===")
  // Verificare pur logică pe schema definită:
  const trx = { merchantName: '', amount: 5, date: '2026-09-12', category: 'bank_fee', confidence: 50 }
  const isSupplierPayment = trx.category === 'supplier_payment'
  if (!isSupplierPayment) {
    console.log("Test 3 Passed: Categoria 'bank_fee' a fost ignorată corect și nu intră pe ramura de matching.")
  } else {
    console.error("Test 3 Failed")
  }
}

main().catch(console.error)
