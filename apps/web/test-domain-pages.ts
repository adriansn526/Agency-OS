import { getDomainPagesBacklinks } from "./lib/integrations/dataforseo";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
async function run() {
  try {
    const data = await getDomainPagesBacklinks("inchideriterase.ro", 10);
    console.log("Pages returned:", data.length);
    console.log(JSON.stringify(data.slice(0,2), null, 2));
  } catch(e) { console.error(e) }
}
run();
