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

    const campaignId = '21713620073'; // PMax
    const pmaxNegatives = ['piese', 'dezmembrari', 'parc dezmembrari', 'piese auto', 'rabla', 'casat', 'schimb', 'variante'];
    
    // Instead of customerNegativeCriteria, let's try creating a Shared Set (negative keyword list)
    // First, check if there's already a negative keyword list we can attach to.
    const sets = await customer.query(`SELECT shared_set.id, shared_set.name FROM shared_set WHERE shared_set.type = 'NEGATIVE_KEYWORDS'`);
    let sharedSetId;
    
    if (sets.length > 0) {
      sharedSetId = sets[0].shared_set.id;
      console.log('Found existing shared set:', sharedSetId);
    } else {
      console.log('Creating new shared set...');
      const createSetResp = await customer.sharedSets.create([{
        name: 'Exclude Piese Dezmembrari',
        type: enums.SharedSetType.NEGATIVE_KEYWORDS
      }]);
      sharedSetId = createSetResp.results[0].resource_name.split('/')[3];
      console.log('Created shared set:', sharedSetId);
    }
    
    // Add keywords to the shared set
    console.log('Adding keywords to shared set...');
    const criteriaOps = pmaxNegatives.map(w => ({
      shared_set: `customers/${customerId}/sharedSets/${sharedSetId}`,
      keyword: {
        text: w,
        match_type: enums.KeywordMatchType.BROAD
      }
    }));
    await customer.sharedCriteria.create(criteriaOps);
    console.log('Keywords added!');
    
    // Attach the shared set to the PMax campaign
    console.log('Attaching shared set to campaign...');
    try {
      await customer.campaignSharedSets.create([{
        campaign: `customers/${customerId}/campaigns/${campaignId}`,
        shared_set: `customers/${customerId}/sharedSets/${sharedSetId}`
      }]);
      console.log('Attached successfully!');
    } catch(e) {
      console.log('Already attached or not allowed for PMax via API.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
