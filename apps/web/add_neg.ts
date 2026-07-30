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
    const customer = client.Customer({
      customer_id: '4116802201',
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
      login_customer_id: '6639317011'
    });

    const campaignId = '23840811722';

    const words = ['management', 'software', 'checklist', 'tools', 'app', 'system', 'systems', 'theory', 'companies', 'ctrl', 'tool'];
    
    const operations = words.map(w => ({
      campaign: `customers/4116802201/campaigns/${campaignId}`,
      negative: true,
      keyword: {
        text: w,
        match_type: enums.KeywordMatchType.BROAD
      }
    }));

    console.log('Adding', operations.length, 'negative keywords...');
    const response = await customer.campaignCriteria.create(operations);
    console.log('Success!', response.results.length, 'keywords added.');

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
