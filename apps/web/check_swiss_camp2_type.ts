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

    const query = `
      SELECT
        campaign.advertising_channel_type,
        campaign.advertising_channel_sub_type,
        campaign.bidding_strategy_type,
        metrics.interactions,
        metrics.interaction_rate
      FROM campaign
      WHERE campaign.id = 22818857448
    `;
    const results = await customer.query(query);
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
