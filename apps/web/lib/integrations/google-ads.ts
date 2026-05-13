/**
 * Google Ads API Client for Agency OS
 * Simplified version from marketing-tools-platform
 */

import { GoogleAdsApi, Customer } from 'google-ads-api';

let client: GoogleAdsApi | null = null;

function getClient(): GoogleAdsApi {
  if (!client) {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

    if (!clientId || !clientSecret || !developerToken) {
      throw new Error('Missing Google Ads credentials');
    }

    client = new GoogleAdsApi({
      client_id: clientId,
      client_secret: clientSecret,
      developer_token: developerToken,
    });
  }
  return client;
}

export function getAdsCustomer(customerId: string): Customer {
  const cleanId = customerId.replace(/[-\s]/g, '');
  const token = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  if (!token) throw new Error('Missing GOOGLE_ADS_REFRESH_TOKEN');

  return getClient().Customer({
    customer_id: cleanId,
    refresh_token: token,
  });
}

/** Account-level metrics for a date range */
export async function getAccountMetrics(customerId: string, dateFrom: string, dateTo: string) {
  const customer = getAdsCustomer(customerId);

  const query = `
    SELECT
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
  `;

  const results = await customer.query(query);

  let impressions = 0, clicks = 0, costMicros = 0, conversions = 0, conversionsValue = 0;

  for (const row of results) {
    impressions += (row.metrics as any)?.impressions || 0;
    clicks += (row.metrics as any)?.clicks || 0;
    costMicros += (row.metrics as any)?.cost_micros || 0;
    conversions += (row.metrics as any)?.conversions || 0;
    conversionsValue += (row.metrics as any)?.conversions_value || 0;
  }

  const spend = costMicros / 1_000_000;
  return {
    impressions,
    clicks,
    spend: +spend.toFixed(2),
    conversions: +conversions.toFixed(1),
    conversionsValue: +conversionsValue.toFixed(2),
    ctr: impressions > 0 ? +((clicks / impressions) * 100).toFixed(2) : 0,
    cpc: clicks > 0 ? +(spend / clicks).toFixed(2) : 0,
    conversionRate: clicks > 0 ? +((conversions / clicks) * 100).toFixed(2) : 0,
    roas: spend > 0 ? +(conversionsValue / spend).toFixed(2) : 0,
  };
}

/** Campaign list with metrics */
export async function getCampaigns(customerId: string, dateFrom: string, dateTo: string) {
  const customer = getAdsCustomer(customerId);

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE campaign.status != 'REMOVED'
      AND segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    ORDER BY metrics.cost_micros DESC
  `;

  const results = await customer.query(query);

  return results.map((row: any) => {
    const imp = row.metrics?.impressions || 0;
    const clk = row.metrics?.clicks || 0;
    const cost = (row.metrics?.cost_micros || 0) / 1_000_000;
    const conv = row.metrics?.conversions || 0;
    const convVal = row.metrics?.conversions_value || 0;

    return {
      id: row.campaign?.id?.toString() || '',
      name: row.campaign?.name || '',
      status: row.campaign?.status || 'UNKNOWN',
      channelType: row.campaign?.advertising_channel_type || 'UNKNOWN',
      budget: row.campaign_budget?.amount_micros ? +(row.campaign_budget.amount_micros / 1_000_000).toFixed(2) : 0,
      metrics: {
        impressions: imp,
        clicks: clk,
        spend: +cost.toFixed(2),
        conversions: +conv.toFixed(1),
        conversionsValue: +convVal.toFixed(2),
        ctr: imp > 0 ? +((clk / imp) * 100).toFixed(2) : 0,
        cpc: clk > 0 ? +(cost / clk).toFixed(2) : 0,
        conversionRate: clk > 0 ? +((conv / clk) * 100).toFixed(2) : 0,
        roas: cost > 0 ? +(convVal / cost).toFixed(2) : 0,
      },
    };
  });
}

/** Daily performance data for charts */
export async function getDailyPerformance(customerId: string, dateFrom: string, dateTo: string) {
  const customer = getAdsCustomer(customerId);

  const query = `
    SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM customer
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
    ORDER BY segments.date ASC
  `;

  const results = await customer.query(query);

  return results.map((row: any) => ({
    date: row.segments?.date || '',
    impressions: row.metrics?.impressions || 0,
    clicks: row.metrics?.clicks || 0,
    spend: +((row.metrics?.cost_micros || 0) / 1_000_000).toFixed(2),
    conversions: +(row.metrics?.conversions || 0).toFixed(1),
    conversionsValue: +(row.metrics?.conversions_value || 0).toFixed(2),
  }));
}

/** Conversion breakdown by action name (auto-discovers new conversions) */
export async function getConversionBreakdown(customerId: string, dateFrom: string, dateTo: string, campaignIds?: string[]) {
  const customer = getAdsCustomer(customerId);

  const campaignFilter = campaignIds?.length
    ? `AND campaign.id IN (${campaignIds.join(',')})`
    : '';

  const query = `
    SELECT
      campaign.name,
      segments.conversion_action_name,
      segments.conversion_action_category,
      metrics.all_conversions,
      metrics.conversions,
      metrics.conversions_value
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      ${campaignFilter}
      AND metrics.all_conversions > 0
  `;

  const results = await customer.query(query);

  // Aggregate by conversion action name
  const byAction = new Map<string, { actionName: string; category: string; conversions: number; allConversions: number; value: number; campaigns: Set<string> }>();

  for (const row of results) {
    const name = (row as any).segments?.conversion_action_name || 'Unknown';
    const cat = (row as any).segments?.conversion_action_category || '';
    const campName = (row as any).campaign?.name || '';
    const existing = byAction.get(name) || { actionName: name, category: cat, conversions: 0, allConversions: 0, value: 0, campaigns: new Set<string>() };
    existing.conversions += (row as any).metrics?.conversions || 0;
    existing.allConversions += (row as any).metrics?.all_conversions || 0;
    existing.value += (row as any).metrics?.conversions_value || 0;
    existing.campaigns.add(campName);
    byAction.set(name, existing);
  }

  return Array.from(byAction.values()).map(a => ({
    actionName: a.actionName,
    category: a.category,
    conversions: +a.conversions.toFixed(1),
    allConversions: +a.allConversions.toFixed(1),
    value: +a.value.toFixed(2),
    campaigns: Array.from(a.campaigns),
  })).sort((a, b) => b.allConversions - a.allConversions);
}

/** Top search terms with performance metrics */
export async function getSearchTerms(customerId: string, dateFrom: string, dateTo: string, campaignIds?: string[], limit = 20) {
  const customer = getAdsCustomer(customerId);

  const campaignFilter = campaignIds?.length
    ? `AND campaign.id IN (${campaignIds.join(',')})`
    : '';

  const query = `
    SELECT
      search_term_view.search_term,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value
    FROM search_term_view
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      ${campaignFilter}
    ORDER BY metrics.clicks DESC
    LIMIT ${limit}
  `;

  const results = await customer.query(query);

  return results.map((row: any) => {
    const imp = row.metrics?.impressions || 0;
    const clk = row.metrics?.clicks || 0;
    const cost = (row.metrics?.cost_micros || 0) / 1_000_000;
    const conv = row.metrics?.conversions || 0;

    return {
      term: row.search_term_view?.search_term || '',
      campaign: row.campaign?.name || '',
      clicks: clk,
      impressions: imp,
      cost: +cost.toFixed(2),
      conversions: +conv.toFixed(1),
      ctr: imp > 0 ? +((clk / imp) * 100).toFixed(2) : 0,
      cpc: clk > 0 ? +(cost / clk).toFixed(2) : 0,
    };
  });
}

/** All conversion actions defined in the account (for reference) */
export async function getConversionActions(customerId: string) {
  const customer = getAdsCustomer(customerId);

  const query = `
    SELECT
      conversion_action.id,
      conversion_action.name,
      conversion_action.type,
      conversion_action.status,
      conversion_action.category
    FROM conversion_action
    WHERE conversion_action.status = 'ENABLED'
  `;

  const results = await customer.query(query);

  return results.map((row: any) => ({
    id: row.conversion_action?.id?.toString() || '',
    name: row.conversion_action?.name || '',
    type: row.conversion_action?.type || '',
    category: row.conversion_action?.category || '',
  }));
}
