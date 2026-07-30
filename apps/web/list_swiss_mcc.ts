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
    
    // We will try accessing the customer without the login_customer_id first to see if it is a direct account or linked via another manager
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const query = 'SELECT customer.id, customer.descriptive_name, customer.manager FROM customer';
    const results = await customer.query(query);
    console.log(JSON.stringify(results, null, 2));

  } catch (error) {
    console.error('Error direct access:', error);
  }
}

run();
