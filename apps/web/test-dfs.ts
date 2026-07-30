import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getKeywordMetrics } from './lib/integrations/dataforseo';

async function test() {
  const data = await getKeywordMetrics(['seo romania']);
  console.log(JSON.stringify(data, null, 2));
}
test();
