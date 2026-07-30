import { getTopPages } from "./lib/integrations/gsc";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  try {
    const pages = await getTopPages("sc-domain:inchideriterase.ro", "2024-03-01", "2026-07-01", 10);
    console.log("GSC length:", pages.length);
    console.log(pages[0]);
  } catch(e) { console.error(e) }
}
run();
