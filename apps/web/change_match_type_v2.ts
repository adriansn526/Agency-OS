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

    const adGroupId = '200013404561';
    
    // Create new phrase match keyword first
    console.log('Adding new phrase match keyword...');
    const createResponse = await customer.adGroupCriteria.create([{
      ad_group: `customers/4116802201/adGroups/${adGroupId}`,
      status: enums.AdGroupCriterionStatus.ENABLED,
      keyword: {
        text: 'product quality inspection service',
        match_type: enums.KeywordMatchType.PHRASE
      }
    }]);
    console.log('Create success!', JSON.stringify(createResponse.results, null, 2));

    // Pause the old broad match keyword (criterion ID 472925435208)
    console.log('Pausing old broad match keyword...');
    const updateResponse = await customer.adGroupCriteria.update([{
      resource_name: `customers/4116802201/adGroupCriteria/${adGroupId}~472925435208`,
      status: enums.AdGroupCriterionStatus.PAUSED
    }]);
    console.log('Update success!', JSON.stringify(updateResponse.results, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
