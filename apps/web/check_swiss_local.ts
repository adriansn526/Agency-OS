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
    const customerId = '8836628286'; 
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    // Check what conversions were recorded for campaign #2
    const convQuery = `
      SELECT
        segments.conversion_action_name,
        metrics.conversions
      FROM campaign
      WHERE campaign.id = 22818857448 AND segments.date DURING LAST_30_DAYS
        AND metrics.conversions > 0
    `;
    const convResults = await customer.query(convQuery);
    
    // Check asset group performance (Performance Max doesn't have standard keywords)
    const assetGroupQuery = `
      SELECT
        asset_group.name,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros,
        metrics.conversions
      FROM asset_group
      WHERE campaign.id = 22818857448
    `;
    const assetGroupResults = await customer.query(assetGroupQuery);

    console.log('Conversions:', JSON.stringify(convResults, null, 2));
    console.log('Asset Groups:', JSON.stringify(assetGroupResults, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
