import 'dotenv/config';
import { db } from './packages/db/src/index.js'
import { runPosthogQuery } from './apps/web/lib/integrations/posthog.js'

async function main() {
  const customProjectId = '113065';
  
  // 1. Check if we have $pageleave events
  const q1 = `SELECT count() as c FROM events WHERE event = '$pageleave' AND timestamp >= now() - INTERVAL 30 DAY`;
  
  // 2. Check for autocapture clicks on tel: or wa.me
  const q2 = `SELECT properties.$elements_chain, count() FROM events WHERE event = '$autocapture' AND timestamp >= now() - INTERVAL 30 DAY AND (properties.$elements_chain LIKE '%tel:%' OR properties.$elements_chain LIKE '%wa.me%') GROUP BY properties.$elements_chain LIMIT 5`;

  // 3. Check for form submissions
  const q3 = `SELECT event, count() FROM events WHERE event LIKE '%form%' OR event = 'submit' OR event = '$form_submit' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY event`;
  
  const project = await db.project.findFirst({ where: { id: 'cmnzkiert0003cuxtu6lrdunv' }});
  
  try {
    console.log("Checking $pageleave...");
    console.log((await runPosthogQuery(project!.clientId!, q1, customProjectId)).results);
    
    console.log("Checking clicks...");
    console.log((await runPosthogQuery(project!.clientId!, q2, customProjectId)).results);
    
    console.log("Checking forms...");
    console.log((await runPosthogQuery(project!.clientId!, q3, customProjectId)).results);
  } catch (e) {
    console.error(e);
  }
}
main();
