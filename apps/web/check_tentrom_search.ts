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
    const customerId = '4111955891'; 
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const searchTermsQuery = `
      SELECT
        search_term_view.search_term,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions
      FROM search_term_view
      WHERE campaign.id = 23306999657 AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
      LIMIT 10
    `;
    const searchTerms = await customer.query(searchTermsQuery);

    console.log('--- Search Terms for "Panouri decorative" (Search) ---');
    console.log(JSON.stringify(searchTerms, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
