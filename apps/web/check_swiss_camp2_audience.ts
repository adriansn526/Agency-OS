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

    const assetGroupId = '6597266785';

    const signalsQuery = `
      SELECT
        asset_group_signal.audience.audience,
        asset_group_signal.search_theme.text
      FROM asset_group_signal
      WHERE asset_group.id = ${assetGroupId}
    `;
    const signals = await customer.query(signalsQuery);

    console.log('--- Audience & Search Themes ---');
    console.log(JSON.stringify(signals, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
