import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleAdsApi } from 'google-ads-api';

async function run() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
  });

  const ids = [
    '2158636226', '2144963770', '2358832019', '2116589696',
    '5000169547', '8172177650', '9238241237', '2484281813',
    '3396990605', '5902722442', '9415763362', '3593073991',
    '6639317011', '4135052760', '4111955891', '7418627947',
    '8836628286', '9951499413', '5006254552', '8279079923',
    '2581621115'
  ];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    try {
      const customer = client.Customer({ customer_id: id, refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '' });
      const query = 'SELECT customer.manager, customer.descriptive_name FROM customer';
      const res = await customer.query(query);
      if (res.length > 0) {
        console.log('ID: ' + id + ' - Name: ' + res[0].customer.descriptive_name + ' - IsManager: ' + res[0].customer.manager);
      }
    } catch (e) {
      console.log('Error for ' + id);
    }
  }
}
run();
