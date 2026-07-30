import 'dotenv/config';
import { db } from '../../packages/db/src/index.js'
import { runPosthogQuery } from './lib/integrations/posthog'

async function main() {
  const project = await db.project.findUnique({
    where: { id: 'cmnzkiert0003cuxtu6lrdunv' },
    select: { clientId: true }
  });

  const hogQlQuery = `
    SELECT 
      properties.$pathname as path, 
      count() as pageviews, 
      count(distinct distinct_id) as unique_visitors
    FROM events 
    WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY
    GROUP BY path
    ORDER BY pageviews DESC
    LIMIT 10
  `;

  try {
    const result = await runPosthogQuery(project!.clientId, hogQlQuery);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  }
}
main();
