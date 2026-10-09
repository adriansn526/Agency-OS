import { extractTransactionsFromText } from './lib/bank/llm-extractor';

async function run() {
  try {
    console.log('Starting extraction test...');
    const sample = "01-10-2026 PLATA CARD eMAG Bucuresti -100 RON\n02-10-2026 INCASARE Popescu Ion +500 RON";
    const res = await extractTransactionsFromText(sample);
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch(e) {
    console.error('Unhandled error:', e);
  }
}
run();
