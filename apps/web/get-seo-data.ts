import { getDomainBacklinksDetail } from './lib/integrations/dataforseo';

async function main() {
  const domain = 'tdgresurseumane.ro';
  
  console.log(`\n=== BACKLINKS DETAIL FOR ${domain} ===`);
  try {
    const details = await getDomainBacklinksDetail(domain, 10);
    console.log(JSON.stringify(details, null, 2));
  } catch (e: any) {
    console.log("Error details:", e.message);
  }
}

main().catch(console.error);
