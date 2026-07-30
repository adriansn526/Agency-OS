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
    const customerId = '2144963770'; 
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const query = `
      SELECT
        campaign.name,
        segments.conversion_action_name,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
        AND metrics.conversions > 0
    `;

    const results = await customer.query(query);
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
