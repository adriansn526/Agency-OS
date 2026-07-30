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
    
    // First, let's find the specific criterion ID for "product quality inspection service"
    const query = `
      SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type
      FROM ad_group_criterion
      WHERE ad_group.id = ${adGroupId}
        AND ad_group_criterion.type = 'KEYWORD'
        AND ad_group_criterion.keyword.text = 'product quality inspection service'
    `;
    
    const results = await customer.query(query);
    if (!results || results.length === 0) {
      console.log('Keyword not found!');
      return;
    }
    
    const criterionId = results[0].ad_group_criterion.criterion_id;
    console.log('Found criterion:', criterionId, 'match type:', results[0].ad_group_criterion.keyword.match_type);
    
    // Changing match type directly is not allowed in Google Ads API (must remove and add)
    // So we'll pause the old broad one and add a new phrase one.
    
    const operations = [
      // 1. Pause the old Broad Match keyword
      {
        update: {
          resource_name: `customers/4116802201/adGroupCriteria/${adGroupId}~${criterionId}`,
          status: enums.AdGroupCriterionStatus.PAUSED
        }
      },
      // 2. Add the new Phrase Match keyword
      {
        create: {
          ad_group: `customers/4116802201/adGroups/${adGroupId}`,
          status: enums.AdGroupCriterionStatus.ENABLED,
          keyword: {
            text: 'product quality inspection service',
            match_type: enums.KeywordMatchType.PHRASE
          }
        }
      }
    ];

    console.log('Updating keyword match type...');
    const response = await customer.adGroupCriteria.mutate(operations);
    console.log('Success!', JSON.stringify(response.results, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
