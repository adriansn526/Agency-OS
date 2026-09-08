import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDomainBacklinksSummary } from './lib/integrations/dataforseo';

async function main() {
  const target = 'fiscalitatea.ro';
  console.log(`\n=== SEO Analysis for: ${target} ===`);
  try {
    const backlinks = await getDomainBacklinksSummary(target);
    if (backlinks) {
      console.log(`- Domain Rank (Authority): ${backlinks.rank}`);
      console.log(`- Total Backlinks: ${backlinks.backlinks}`);
      console.log(`- Referring Domains: ${backlinks.referring_domains}`);
    } else {
      console.log("No backlink data found.");
    }
  } catch (e) {
    console.log("Error fetching details for " + target);
  }
}

main().catch(console.error);
