const { PrismaClient } = require('@prisma/client');
async function run() {
  const db = new PrismaClient();
  const searchStr = "IPC 03";
  
  // Search common fields that might hold this
  const offers = await db.offer.findMany();
  for (const o of offers) {
    if (o.notes && o.notes.includes(searchStr)) console.log(`Found in Offer ${o.id} notes`);
    if (o.description && o.description.includes(searchStr)) console.log(`Found in Offer ${o.id} description`);
    if (o.terms && o.terms.includes(searchStr)) console.log(`Found in Offer ${o.id} terms`);
    if (o.contractNotes && o.contractNotes.includes(searchStr)) console.log(`Found in Offer ${o.id} contractNotes`);
  }
  
  const contracts = await db.contract.findMany();
  for (const c of contracts) {
    if (c.terms && c.terms.includes(searchStr)) console.log(`Found in Contract ${c.id} terms`);
    if (c.customClauses && c.customClauses.includes(searchStr)) console.log(`Found in Contract ${c.id} customClauses`);
  }

  const projects = await db.project.findMany();
  for (const p of projects) {
    if (p.description && p.description.includes(searchStr)) console.log(`Found in Project ${p.id} description`);
  }

  // AccountingSettings 
  const cset = await db.accountingSettings.findMany();
  for (const c of cset) {
    if (c.defaultContractTerms && c.defaultContractTerms.includes(searchStr)) console.log(`Found in AccountingSettings defaultContractTerms`);
  }

  // Contract Templates?
  // Let's check Service
  const services = await db.service.findMany();
  for (const s of services) {
    if (s.description && s.description.includes(searchStr)) console.log(`Found in Service ${s.id} description`);
  }

  await db.$disconnect();
}
run();
