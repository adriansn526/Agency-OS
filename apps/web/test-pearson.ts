import { getDomainPagesBacklinks } from "./lib/integrations/dataforseo";
import { getTopPages } from "./lib/integrations/gsc";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

function pearsonCorrelation(x: number[], y: number[]) {
  const n = x.length;
  if (n === 0) return 0;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * (y[i] || 0), 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (den === 0) return 0;
  return num / den;
}

async function run() {
  const domain = "inchideriterase.ro";
  const dfsPages = await getDomainPagesBacklinks(domain, 100);
  const gscPages = await getTopPages(`sc-domain:${domain}`, "2026-06-01", "2026-07-01", 100);
  
  const extMap = new Map();
  for (const dp of dfsPages) {
    const path = new URL(dp.url).pathname;
    extMap.set(path, dp);
  }

  const merged = gscPages.map((g: any) => {
    const gscUrl = g.keys?.[0] || g.page || '';
    const path = gscUrl.replace(`https://${domain}`, '').replace(`http://${domain}`, '') || '/';
    const extPage = extMap.get(path) || extMap.get(path.replace(/\/$/, '')) || extMap.get(path + '/');
    return {
      path,
      clicks: g.clicks || 0,
      external: extPage?.backlinks || 0,
      rank: extPage?.rank || 0
    };
  }).filter((d: any) => d.clicks > 0);

  const xExt = merged.map((d: any) => d.external);
  const xRank = merged.map((d: any) => d.rank);
  const yClicks = merged.map((d: any) => d.clicks);

  console.log("Pages matched with external > 0:", merged.filter((m: any) => m.external > 0).length);
  console.log("Corr External/Clicks:", pearsonCorrelation(xExt, yClicks));
  console.log("Corr Rank/Clicks:", pearsonCorrelation(xRank, yClicks));
}
run();
