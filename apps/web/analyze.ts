import { getGSCDailyPerformance } from './lib/integrations/gsc';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const siteUrl = 'sc-domain:inchideriterase.ro';
  
  // 7 days before 2026-07-19
  const beforeStart = '2026-07-12';
  const beforeEnd = '2026-07-18';
  
  // 7 days after 2026-07-19
  const afterStart = '2026-07-20';
  const afterEnd = '2026-07-26';
  
  const beforeData = await getGSCDailyPerformance(siteUrl, beforeStart, beforeEnd);
  const afterData = await getGSCDailyPerformance(siteUrl, afterStart, afterEnd);
  
  const bClicks = beforeData.reduce((acc, c) => acc + c.clicks, 0);
  const bImpr = beforeData.reduce((acc, c) => acc + c.impressions, 0);
  const bAvgClicks = bClicks / 7;
  const bAvgImpr = bImpr / 7;

  const aClicks = afterData.reduce((acc, c) => acc + c.clicks, 0);
  const aImpr = afterData.reduce((acc, c) => acc + c.impressions, 0);
  const aAvgClicks = aClicks / 7;
  const aAvgImpr = aImpr / 7;

  const clickDiff = bAvgClicks > 0 ? ((aAvgClicks - bAvgClicks) / bAvgClicks) * 100 : 0;
  const imprDiff = bAvgImpr > 0 ? ((aAvgImpr - bAvgImpr) / bAvgImpr) * 100 : 0;

  console.log('--- Analiza Adnotare 19 Iulie 2026 (inchideriterase.ro) ---');
  console.log(`Perioada Before (12 iul - 18 iul):`);
  console.log(`  Clicks: ${bClicks} (medie: ${bAvgClicks.toFixed(1)}/zi)`);
  console.log(`  Impresii: ${bImpr} (medie: ${bAvgImpr.toFixed(0)}/zi)`);
  console.log(`Perioada After (20 iul - 26 iul):`);
  console.log(`  Clicks: ${aClicks} (medie: ${aAvgClicks.toFixed(1)}/zi)`);
  console.log(`  Impresii: ${aImpr} (medie: ${aAvgImpr.toFixed(0)}/zi)`);
  console.log(`\nIMPACT (7 zile vs 7 zile):`);
  console.log(`  Evolutie Clicks: ${clickDiff > 0 ? '+' : ''}${clickDiff.toFixed(1)}%`);
  console.log(`  Evolutie Afisari: ${imprDiff > 0 ? '+' : ''}${imprDiff.toFixed(1)}%`);
}

main().catch(console.error);
