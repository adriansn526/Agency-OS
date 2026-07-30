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
    // Accessing directly since it seems to be directly accessible via the refresh token without the MCC login_customer_id, or it is linked differently
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
    `;

    console.log('Fetching campaigns for Swiss Amanet...');
    const results = await customer.query(query);
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
