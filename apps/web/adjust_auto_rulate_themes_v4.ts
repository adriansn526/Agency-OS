import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleAdsApi, enums } from 'google-ads-api';

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

    const pmaxNegatives = ['piese', 'dezmembrari', 'parc dezmembrari', 'piese auto', 'rabla', 'casat', 'schimb', 'variante'];
    console.log('Adding negative keywords to account level...');
    const accountNegOps = pmaxNegatives.map(w => ({
      type: enums.CriterionType.KEYWORD,
      keyword: {
        text: w,
        match_type: enums.KeywordMatchType.BROAD
      }
    }));
    await customer.customerNegativeCriteria.create(accountNegOps);
    console.log('Success adding account-level negatives!');

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
