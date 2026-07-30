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
    const customerId = '8836628286'; // Swiss Amanet
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const campaignId = '22818857448'; // Campaign #2

    const searchTermsQuery = `
      SELECT
        search_term_view.search_term,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM search_term_view
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
      LIMIT 10
    `;
    const searchTerms = await customer.query(searchTermsQuery);

    const keywordsQuery = `
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM keyword_view
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
      LIMIT 10
    `;
    const keywords = await customer.query(keywordsQuery);

    console.log('--- Campaign #2 Deep Dive ---');
    console.log('Search Terms:', JSON.stringify(searchTerms, null, 2));
    console.log('Keywords:', JSON.stringify(keywords, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
