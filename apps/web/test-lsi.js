import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fetch from 'node-fetch';
async function test() {
  const res = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/related_keywords/live', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + process.env.DATAFORSEO_AUTH_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{
      keyword: "terase din lemn lipite de casa preturi",
      location_code: 2642,
      language_code: "ro",
      limit: 10
    }])
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
