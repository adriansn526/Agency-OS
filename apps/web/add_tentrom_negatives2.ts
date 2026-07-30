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
    const customerId = '4111955891'; 
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const campaignId = '23306999657'; // Panouri decorative (Search)

    const negativeWords = ['milenium decorativ arad', 'decorneo', 'dedeman', 'autoadezive', 'lipit'];
    
    const negativeOperations = negativeWords.map(w => ({
      campaign: `customers/${customerId}/campaigns/${campaignId}`,
      negative: true,
      keyword: {
        text: w,
        match_type: enums.KeywordMatchType.BROAD
      }
    }));

    console.log('Adding negative keywords:', negativeWords.join(', '));
    const negResponse = await customer.campaignCriteria.create(negativeOperations);
    console.log('Success! Added extra negative keywords.');

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
