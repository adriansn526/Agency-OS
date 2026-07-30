import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleAdsApi } from 'google-ads-api';

async function run() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
  });

  try {
    const customer = client.Customer({
      customer_id: '4116802201',
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
      login_customer_id: '6639317011'
    });

    const campaignId = '23840811722';

    const adGroupQuery = `
      SELECT
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM ad_group
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
    `;
    const adGroups = await customer.query(adGroupQuery);

    const searchTermsQuery = `
      SELECT
        search_term_view.search_term,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM search_term_view
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
      LIMIT 15
    `;
    const searchTerms = await customer.query(searchTermsQuery);

    const keywordsQuery = `
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM keyword_view
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
      LIMIT 10
    `;
    const keywords = await customer.query(keywordsQuery);

    const devicesQuery = `
      SELECT
        segments.device,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM campaign
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
    `;
    const devices = await customer.query(devicesQuery);

    console.log(JSON.stringify({ adGroups, searchTerms, keywords, devices }, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}
run();
