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

    const campaignId = '22309675897'; // PMax

    // Get asset groups for PMax campaign
    const agQuery = `
      SELECT asset_group.id, asset_group.name 
      FROM asset_group 
      WHERE campaign.id = ${campaignId} AND asset_group.status = 'ENABLED'
    `;
    const assetGroups = await customer.query(agQuery);
    
    console.log('--- Asset Groups in PMax ---');
    console.log(JSON.stringify(assetGroups, null, 2));

    // Get search themes for these asset groups
    for (const ag of assetGroups) {
      const id = (ag as any).asset_group.id;
      const sigQuery = `
        SELECT asset_group_signal.search_theme.text
        FROM asset_group_signal
        WHERE asset_group.id = ${id}
      `;
      const signals = await customer.query(sigQuery);
      console.log(`\nSearch Themes for Asset Group ${id}:`);
      console.log(JSON.stringify(signals, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
