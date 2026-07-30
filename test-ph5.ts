import 'dotenv/config';
import { db } from './packages/db/src/index.js'
import { runPosthogQuery } from './apps/web/lib/integrations/posthog.js'

async function main() {
  const customProjectId = '113065';
  
  const hogQlQuery = `
    SELECT 
      properties.$pathname as path, 
      count() as pageviews, 
      count(distinct distinct_id) as unique_visitors
    FROM events 
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY
    GROUP BY path
    ORDER BY pageviews DESC
    LIMIT 5
  `;
  
  // Find project
  const project = await db.project.findFirst({ where: { id: 'cmnzkiert0003cuxtu6lrdunv' }});
  
  try {
    const result = await runPosthogQuery(project!.clientId!, hogQlQuery, customProjectId);
    console.log("Results:");
    console.log(JSON.stringify(result.results, null, 2));
  } catch (e) {
    console.error(e);
  }
}
main();
