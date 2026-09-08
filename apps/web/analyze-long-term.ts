import { getGSCDailyPerformance } from './lib/integrations/gsc';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const siteUrl = 'sc-domain:inchideriterase.ro';
  
  // After: 2026-07-20 to 2026-09-06 (49 days)
  const afterStart = '2026-07-20';
  const afterEnd = '2026-09-06';
  
  // Before: 49 days before 2026-07-20 is 2026-06-01 to 2026-07-19
  const beforeStart = '2026-06-01';
  const beforeEnd = '2026-07-19';
  
  const beforeData = await getGSCDailyPerformance(siteUrl, beforeStart, beforeEnd);
  const afterData = await getGSCDailyPerformance(siteUrl, afterStart, afterEnd);
  
  const bClicks = beforeData.reduce((acc, c) => acc + c.clicks, 0);
  const bImpr = beforeData.reduce((acc, c) => acc + c.impressions, 0);
  const bAvgClicks = beforeData.length > 0 ? bClicks / beforeData.length : 0;
  const bAvgImpr = beforeData.length > 0 ? bImpr / beforeData.length : 0;

  const aClicks = afterData.reduce((acc, c) => acc + c.clicks, 0);
  const aImpr = afterData.reduce((acc, c) => acc + c.impressions, 0);
  const aAvgClicks = afterData.length > 0 ? aClicks / afterData.length : 0;
  const aAvgImpr = afterData.length > 0 ? aImpr / afterData.length : 0;

  const clickDiff = bAvgClicks > 0 ? ((aAvgClicks - bAvgClicks) / bAvgClicks) * 100 : 0;
  const imprDiff = bAvgImpr > 0 ? ((aAvgImpr - bAvgImpr) / bAvgImpr) * 100 : 0;

  console.log('--- Analiza Pe Termen Lung (pana azi) ---');
  console.log(`Perioada Before (01 iun - 19 iul, ${beforeData.length} zile):`);
  console.log(`  Clicks: ${bClicks} (medie: ${bAvgClicks.toFixed(1)}/zi)`);
  console.log(`  Impresii: ${bImpr} (medie: ${bAvgImpr.toFixed(0)}/zi)`);
  
  console.log(`\nPerioada After (20 iul - 06 sep, ${afterData.length} zile):`);
  console.log(`  Clicks: ${aClicks} (medie: ${aAvgClicks.toFixed(1)}/zi)`);
  console.log(`  Impresii: ${aImpr} (medie: ${aAvgImpr.toFixed(0)}/zi)`);
  
  console.log(`\nIMPACT MEDIU ZILNIC (${beforeData.length} zile vs ${afterData.length} zile):`);
  console.log(`  Evolutie Clicks: ${clickDiff > 0 ? '+' : ''}${clickDiff.toFixed(1)}%`);
  console.log(`  Evolutie Afisari: ${imprDiff > 0 ? '+' : ''}${imprDiff.toFixed(1)}%`);
}

main().catch(console.error);
