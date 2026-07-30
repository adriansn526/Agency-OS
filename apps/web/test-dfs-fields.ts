import { getAuthHeader } from "./lib/integrations/dataforseo";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function run() {
    const token = process.env.DATAFORSEO_AUTH_TOKEN;
    const res = await fetch('https://api.dataforseo.com/v3/backlinks/backlinks/live', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([{ target: "inchideriterase.ro", limit: 1 }])
    })
    const data = await res.json();
    console.log(JSON.stringify(data.tasks[0].result[0].items[0], null, 2));
}
run();
