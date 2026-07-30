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
      customer_id: '8836628286',
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const campaignId = '22818857448';

    // Check URLs in Asset Groups
    const assetGroupQuery = `
      SELECT
        asset_group.id,
        asset_group.name,
        asset_group.final_urls,
        asset_group.path1,
        asset_group.path2
      FROM asset_group
      WHERE campaign.id = ${campaignId}
    `;
    const assetGroups = await customer.query(assetGroupQuery);

    // Check Conversion Actions defined in the account
    const conversionsQuery = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.type,
        conversion_action.status,
        conversion_action.category,
        conversion_action.primary_for_goal
      FROM conversion_action
      WHERE conversion_action.status = 'ENABLED'
    `;
    const conversions = await customer.query(conversionsQuery);

    console.log('--- Asset Groups (URLs) ---');
    console.log(JSON.stringify(assetGroups, null, 2));
    
    console.log('\n--- Conversion Actions ---');
    console.log(JSON.stringify(conversions, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
