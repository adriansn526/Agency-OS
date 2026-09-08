import { db } from './lib/db'
import { getMasterPosthog } from './lib/integrations/posthog'

async function test() {
  const masterKey = process.env.POSTHOG_PERSONAL_API_KEY;
  console.log("Master key present:", !!masterKey);
  
  const projectId = '113065';
  const query = "SELECT count() FROM events WHERE timestamp > toDateTime('2026-07-01 00:00:00')";

  const execRes = await fetch(`https://eu.posthog.com/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterKey}`
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query
      }
    })
  });

  const text = await execRes.text();
  console.log("Status:", execRes.status);
  console.log("Result:", text);
}

test().catch(console.error);
