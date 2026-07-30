import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleAdsApi } from 'google-ads-api';

async function run() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });

  try {
    const customers = await client.listAccessibleCustomers(process.env.GOOGLE_ADS_REFRESH_TOKEN!);
    console.log('Accessible Customers:', customers);
  } catch (err) {
    console.error(err);
  }
}
run();
