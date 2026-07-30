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
    const customerId = '8836628286'; // Swiss Amanet
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const campaignId = '22921264314'; // Leads-Search-1
    const adGroupId = '187883252761';
    
    // 1. Add Negative Keywords to the Campaign
    const negativeWords = ['andy', 'popescu', 'autoklass', 'vanzare', 'cumparare', 'dealer', 'second', 'hand', 'rulate', 'credite', 'credit'];
    
    const negativeOperations = negativeWords.map(w => ({
      campaign: `customers/${customerId}/campaigns/${campaignId}`,
      negative: true,
      keyword: {
        text: w,
        match_type: enums.KeywordMatchType.BROAD
      }
    }));

    console.log('Adding', negativeOperations.length, 'negative keywords...');
    const negResponse = await customer.campaignCriteria.create(negativeOperations);
    console.log('Success! Added negative keywords.');

    // 2. Change "amanet auto" to Phrase Match
    // 2.a Add new phrase match
    console.log('Adding phrase match keyword "amanet auto"...');
    const createKwResp = await customer.adGroupCriteria.create([{
      ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
      status: enums.AdGroupCriterionStatus.ENABLED,
      keyword: {
        text: 'amanet auto',
        match_type: enums.KeywordMatchType.PHRASE
      }
    }]);
    console.log('Success! Phrase match added.');

    // 2.b Pause old broad match
    const broadKwId = '314813955540';
    console.log('Pausing old broad match keyword...');
    const pauseKwResp = await customer.adGroupCriteria.update([{
      resource_name: `customers/${customerId}/adGroupCriteria/${adGroupId}~${broadKwId}`,
      status: enums.AdGroupCriterionStatus.PAUSED
    }]);
    console.log('Success! Old keyword paused.');

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
