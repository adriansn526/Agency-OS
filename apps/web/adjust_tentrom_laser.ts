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

    const laserCampaignId = '22949216152'; // Debitare Laser
    const pmaxCampaignId = '22309675897'; // Campaign #1 (PMax)

    // 1. Pause the PMax Campaign
    console.log('Pausing PMax Campaign (Campaign #1)...');
    try {
      await customer.campaigns.update([{
        resource_name: `customers/${customerId}/campaigns/${pmaxCampaignId}`,
        status: enums.CampaignStatus.PAUSED
      }]);
      console.log('Successfully paused PMax Campaign.');
    } catch(e: any) {
      console.log('Error pausing PMax:', e.message);
    }

    // 2. Increase Budget for Debitare Laser (from 3 to 25)
    console.log('Increasing budget for Debitare Laser...');
    try {
      const campQuery = `SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = ${laserCampaignId}`;
      const campRes = await customer.query(campQuery);
      const budgetResource = campRes[0].campaign.campaign_budget;
      
      await customer.campaignBudgets.update([{
        resource_name: budgetResource,
        amount_micros: 25000000 // 25 RON
      }]);
      console.log('Successfully increased budget to 25 RON/day.');
    } catch(e: any) {
      console.log('Error updating budget:', e.message);
    }

    // 3. Add Negative Keywords for non-metal materials
    console.log('Adding negative keywords (lemn, plastic, mdf, pal, plexiglas, acrilic)...');
    const negativeWords = ['lemn', 'plastic', 'mdf', 'pal', 'plexiglas', 'acrilic'];
    const negativeOperations = negativeWords.map(w => ({
      campaign: `customers/${customerId}/campaigns/${laserCampaignId}`,
      negative: true,
      keyword: {
        text: w,
        match_type: enums.KeywordMatchType.BROAD
      }
    }));
    try {
      await customer.campaignCriteria.create(negativeOperations);
      console.log('Successfully added negative keywords.');
    } catch(e: any) {
      console.log('Error adding negative keywords:', e.message);
    }

    // 4. Update AdGroup Keywords (Broad -> Phrase)
    console.log('Updating keywords from Broad to Phrase Match...');
    try {
      const adGroupQuery = `SELECT ad_group.id FROM ad_group WHERE campaign.id = ${laserCampaignId} LIMIT 1`;
      const agRes = await customer.query(adGroupQuery);
      const adGroupId = agRes[0].ad_group.id;

      // Create new Phrase Match keywords
      const newKeywords = ['debitare laser', 'debitare plasma', 'tabla decupata cnc', 'tabla debitata laser'];
      const createKwOps = newKeywords.map(text => ({
        ad_group: `customers/${customerId}/adGroups/${adGroupId}`,
        status: enums.AdGroupCriterionStatus.ENABLED,
        keyword: {
          text: text,
          match_type: enums.KeywordMatchType.PHRASE
        }
      }));
      await customer.adGroupCriteria.create(createKwOps);
      console.log('Added new Phrase Match keywords.');

      // Pause old keywords
      const kwQuery = `
        SELECT ad_group_criterion.criterion_id, ad_group_criterion.keyword.match_type 
        FROM ad_group_criterion 
        WHERE ad_group.id = ${adGroupId} AND ad_group_criterion.status = 'ENABLED' AND ad_group_criterion.type = 'KEYWORD'
      `;
      const kws = await customer.query(kwQuery);
      
      const pauseKwOps = [];
      for (const kw of kws) {
        // Pause if it's Broad Match (match_type 4 usually in the API enums or 2 for Broad) or if it's the strange exact match
        const matchType = (kw as any).ad_group_criterion.keyword.match_type;
        // Pause all existing enabled ones to replace with our clean phrase list
        pauseKwOps.push({
          resource_name: `customers/${customerId}/adGroupCriteria/${adGroupId}~${(kw as any).ad_group_criterion.criterion_id}`,
          status: enums.AdGroupCriterionStatus.PAUSED
        });
      }
      if (pauseKwOps.length > 0) {
        await customer.adGroupCriteria.update(pauseKwOps);
        console.log(`Paused ${pauseKwOps.length} old keywords.`);
      }
    } catch(e: any) {
      console.log('Error updating keywords:', e.message);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
