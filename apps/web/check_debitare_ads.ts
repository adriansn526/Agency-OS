import { GoogleAdsApi } from 'google-ads-api';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const campaignIds = ['23508761243', '22949216152', '22420337691', '23306999657', '22309675897'];
const customerId = '4111955891';
const dateFrom = '2026-05-29';
const dateTo = '2026-06-28';

async function main() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });

  const customer = client.Customer({
    customer_id: customerId,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    login_customer_id: process.env.GOOGLE_ADS_MANAGER_ID,
  });

  console.log(`\n=== Checking ALL campaigns for CID=${customerId} ===`);
  const q = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE campaign.status != 'REMOVED'
      AND segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    ORDER BY metrics.cost_micros DESC
  `;

  const results = await customer.query(q);
  console.log(`Total campaigns with data: ${results.length}`);
  for (const r of results) {
    const id = (r.campaign as any)?.id?.toString();
    const name = (r.campaign as any)?.name;
    const status = (r.campaign as any)?.status;
    const clicks = (r.metrics as any)?.clicks || 0;
    const impressions = (r.metrics as any)?.impressions || 0;
    const cost = ((r.metrics as any)?.cost_micros || 0) / 1_000_000;
    const isDebitare = campaignIds.includes(id);
    console.log(`  [${isDebitare ? 'DEBITARE ✓' : 'OTHER    '}] ID=${id} | ${name} | status=${status} | clicks=${clicks} impressions=${impressions} spend=${cost.toFixed(2)} RON`);
  }

  console.log(`\n=== Debitare campaign IDs lookup ===`);
  console.log(`Looking for: ${campaignIds.join(', ')}`);
  const found = results.filter((r: any) => campaignIds.includes((r.campaign as any)?.id?.toString()));
  console.log(`Found ${found.length}/${campaignIds.length} debitare campaigns with data in period.`);
  if (found.length === 0) {
    console.log('\n⚠️  NONE of the debitare campaign IDs returned data for this period!');
    console.log('    Possible reasons:');
    console.log('    1. Campaigns are paused/ended and had 0 activity');
    console.log('    2. Campaign IDs are wrong');
    console.log('    3. Campaigns belong to a different customer account');
  }
}

main().catch(console.error);
