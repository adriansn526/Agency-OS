import 'dotenv/config';
import { db } from './packages/db/src/index.js'
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.NEXTAUTH_SECRET || process.env.ENCRYPTION_KEY || 'default-secret-key-32-chars-long!'
const ALGORITHM = 'aes-256-cbc'

function decrypt(text: string) {
  if (!text || !text.includes(':')) return text
  try {
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift()!, 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
  } catch (e) {
    return text
  }
}

async function main() {
  const account = await db.connectedAccount.findFirst({
    where: { provider: 'posthog', clientId: null }
  });
  const token = decrypt(account!.accessToken);
  
  const client = await db.client.findUnique({
    where: { id: 'cmnzkiert0003cuxtu6lrdunv' }
  });
  
  const res = await fetch('https://eu.posthog.com/api/projects/', { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  const projectId = data.results[0].id;
  
  const query = {
    query: {
      kind: 'HogQLQuery',
      query: `SELECT properties.$pathname as path, count() as pageviews, count(distinct distinct_id) as unique_visitors FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY path ORDER BY pageviews DESC LIMIT 10`
    }
  };
  
  const res2 = await fetch(`https://eu.posthog.com/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(query)
  });
  
  const data2 = await res2.json();
  console.log("Results:");
  console.log(JSON.stringify(data2.results, null, 2));
}
main();
