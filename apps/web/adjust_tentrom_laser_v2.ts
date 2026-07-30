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

    const laserCampaignId = '22949216152'; 
    const adGroupQuery = `SELECT ad_group.id FROM ad_group WHERE campaign.id = ${laserCampaignId} LIMIT 1`;
    const agRes = await customer.query(adGroupQuery);
    const adGroupId = agRes[0].ad_group.id;

    // The phrase keywords were added successfully, we just need to pause the old BROAD and EXACT ones
    const kwQuery = `
      SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.match_type, ad_group_criterion.keyword.text
      FROM ad_group_criterion 
      WHERE ad_group.id = ${adGroupId} AND ad_group_criterion.status = 'ENABLED' AND ad_group_criterion.type = 'KEYWORD'
    `;
    const kws = await customer.query(kwQuery);
    
    const pauseKwOps = [];
    for (const kw of kws) {
      const matchType = (kw as any).ad_group_criterion.keyword.match_type;
      const text = (kw as any).ad_group_criterion.keyword.text;
      
      // Pause if it's Broad Match (usually 4) or the weird Exact match (2)
      // Since we just added Phrase match (3), we skip pausing the ones we just added
      if (matchType !== enums.KeywordMatchType.PHRASE) {
        pauseKwOps.push({
          resource_name: `customers/${customerId}/adGroupCriteria/${adGroupId}~${(kw as any).ad_group_criterion.criterion_id}`,
          status: enums.AdGroupCriterionStatus.PAUSED
        });
        console.log('Will pause:', text, 'Match Type:', matchType);
      }
    }

    if (pauseKwOps.length > 0) {
      await customer.adGroupCriteria.update(pauseKwOps);
      console.log(`Successfully paused ${pauseKwOps.length} old keywords.`);
    } else {
      console.log('No old keywords needed pausing.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
