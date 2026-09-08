import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getRelatedKeywords } from './lib/integrations/dataforseo';

async function main() {
  const target = process.argv[2] || 'aviz de munca';
  console.log(`\n=== Related Keywords for: ${target} ===`);
  try {
    const keywords = await getRelatedKeywords(target);
    if (keywords && keywords.length > 0) {
      // Sort by search volume descending
      keywords.sort((a, b) => b.search_volume - a.search_volume);
      for (const kw of keywords.slice(0, 30)) {
        console.log(`- ${kw.keyword} (Vol: ${kw.search_volume}, Diff: ${kw.keyword_difficulty}, CPC: ${kw.cpc})`);
      }
    } else {
      console.log("No related keywords found.");
    }
  } catch (e) {
    console.log("Error fetching details for " + target);
    console.error(e);
  }
}

main().catch(console.error);
