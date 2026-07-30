import { GoogleAdsApi } from 'google-ads-api';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CUSTOMER_ID = '4111955891';
const CAMPAIGN_ID = '23306999657'; // Panouri decorative
const DATE_FROM = '2026-06-01';
const DATE_TO = '2026-06-28';

async function main() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });

  const customer = client.Customer({
    customer_id: CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    login_customer_id: process.env.GOOGLE_ADS_MANAGER_ID,
  });

  // ── 1. Ad Groups ──
  console.log('\n====== AD GROUPS ======');
  const agRes = await customer.query(`
    SELECT
      ad_group.id, ad_group.name, ad_group.status,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.conversions, metrics.conversions_value
    FROM ad_group
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND segments.date BETWEEN '${DATE_FROM}' AND '${DATE_TO}'
    ORDER BY metrics.clicks DESC
  `);
  for (const r of agRes) {
    const cost = ((r.metrics as any).cost_micros || 0) / 1e6;
    console.log(`  [${(r.ad_group as any).name}] status=${(r.ad_group as any).status} | clicks=${(r.metrics as any).clicks} imp=${(r.metrics as any).impressions} spend=RON${cost.toFixed(2)} conv=${(r.metrics as any).conversions}`);
  }

  // ── 2. Keywords ──
  console.log('\n====== KEYWORDS ======');
  const kwRes = await customer.query(`
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.quality_info.quality_score,
      ad_group_criterion.status,
      metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM keyword_view
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND segments.date BETWEEN '${DATE_FROM}' AND '${DATE_TO}'
    ORDER BY metrics.clicks DESC
    LIMIT 20
  `);
  for (const r of kwRes) {
    const cost = ((r.metrics as any).cost_micros || 0) / 1e6;
    const qs = (r.ad_group_criterion as any)?.quality_info?.quality_score;
    const kw = (r.ad_group_criterion as any)?.keyword;
    console.log(`  "${kw?.text}" [${kw?.match_type}] QS=${qs ?? 'N/A'} status=${(r.ad_group_criterion as any).status} | clicks=${(r.metrics as any).clicks} imp=${(r.metrics as any).impressions} spend=RON${cost.toFixed(2)} conv=${(r.metrics as any).conversions}`);
  }

  // ── 3. Search Terms ──
  console.log('\n====== TOP SEARCH TERMS ======');
  const stRes = await customer.query(`
    SELECT
      search_term_view.search_term,
      search_term_view.status,
      metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM search_term_view
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND segments.date BETWEEN '${DATE_FROM}' AND '${DATE_TO}'
    ORDER BY metrics.clicks DESC
    LIMIT 20
  `);
  for (const r of stRes) {
    const cost = ((r.metrics as any).cost_micros || 0) / 1e6;
    const ctr = (r.metrics as any).impressions > 0 ? (((r.metrics as any).clicks / (r.metrics as any).impressions) * 100).toFixed(1) : '0';
    console.log(`  "${(r.search_term_view as any).search_term}" status=${(r.search_term_view as any).status} | clicks=${(r.metrics as any).clicks} imp=${(r.metrics as any).impressions} CTR=${ctr}% spend=RON${cost.toFixed(2)} conv=${(r.metrics as any).conversions}`);
  }

  // ── 4. Device Breakdown ──
  console.log('\n====== DEVICE BREAKDOWN ======');
  const devRes = await customer.query(`
    SELECT
      segments.device,
      metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND segments.date BETWEEN '${DATE_FROM}' AND '${DATE_TO}'
  `);
  for (const r of devRes) {
    const cost = ((r.metrics as any).cost_micros || 0) / 1e6;
    const ctr = (r.metrics as any).impressions > 0 ? (((r.metrics as any).clicks / (r.metrics as any).impressions) * 100).toFixed(1) : '0';
    console.log(`  [${(r.segments as any).device}] clicks=${(r.metrics as any).clicks} imp=${(r.metrics as any).impressions} CTR=${ctr}% spend=RON${cost.toFixed(2)} conv=${(r.metrics as any).conversions}`);
  }

  // ── 5. Conversions Breakdown ──
  console.log('\n====== CONVERSIONS ======');
  const convRes = await customer.query(`
    SELECT
      conversion_action.name,
      conversion_action.category,
      metrics.conversions,
      metrics.all_conversions,
      metrics.conversions_value
    FROM campaign
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND segments.date BETWEEN '${DATE_FROM}' AND '${DATE_TO}'
      AND metrics.conversions > 0
  `).catch(() => []);
  if ((convRes as any[]).length === 0) {
    console.log('  (no conversion data by action for this campaign)');
  }
  for (const r of convRes as any[]) {
    console.log(`  [${r.conversion_action?.name}] cat=${r.conversion_action?.category} conversions=${r.metrics?.conversions} allConv=${r.metrics?.all_conversions} value=${r.metrics?.conversions_value}`);
  }

  // ── 6. Daily trend ──
  console.log('\n====== DAILY PERFORMANCE ======');
  const dailyRes = await customer.query(`
    SELECT
      segments.date,
      metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND segments.date BETWEEN '${DATE_FROM}' AND '${DATE_TO}'
    ORDER BY segments.date ASC
  `);
  for (const r of dailyRes) {
    const cost = ((r.metrics as any).cost_micros || 0) / 1e6;
    const clicks = (r.metrics as any).clicks || 0;
    const imp = (r.metrics as any).impressions || 0;
    if (clicks > 0 || imp > 0) {
      console.log(`  ${(r.segments as any).date} | clicks=${clicks} imp=${imp} spend=RON${cost.toFixed(2)} conv=${(r.metrics as any).conversions}`);
    }
  }

  // ── 7. Geo ──
  console.log('\n====== TOP LOCATIONS ======');
  const geoRes = await customer.query(`
    SELECT
      geographic_view.location_type,
      campaign_criterion.location.geo_target_constant,
      metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions
    FROM geographic_view
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND segments.date BETWEEN '${DATE_FROM}' AND '${DATE_TO}'
    ORDER BY metrics.clicks DESC
    LIMIT 10
  `).catch(() => []);
  for (const r of geoRes as any[]) {
    const cost = (r.metrics?.cost_micros || 0) / 1e6;
    console.log(`  geo=${r.geographic_view?.location_type} target=${r.campaign_criterion?.location?.geo_target_constant} | clicks=${r.metrics?.clicks} imp=${r.metrics?.impressions} spend=RON${cost.toFixed(2)}`);
  }
}

main().catch(console.error);
