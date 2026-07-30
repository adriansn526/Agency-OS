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

    const assetGroupId = '6517896764'; // Grup de elemente 1 din PMax

    // 1. Fetch current search themes to remove the bad ones
    const signalsQuery = `
      SELECT
        asset_group_signal.resource_name,
        asset_group_signal.search_theme.text
      FROM asset_group_signal
      WHERE asset_group.id = ${assetGroupId}
    `;
    const currentSignals = await customer.query(signalsQuery);

    const badThemes = ['cumpar masina', 'cumpar masina second hand'];
    const removeOperations = [];

    currentSignals.forEach((sig: any) => {
      const text = sig.asset_group_signal?.search_theme?.text;
      if (text && badThemes.includes(text)) {
        removeOperations.push({
          remove: sig.asset_group_signal.resource_name
        });
      }
    });

    console.log('Removing', removeOperations.length, 'bad search themes...');
    if (removeOperations.length > 0) {
      const removeResp = await customer.assetGroupSignals.mutate(removeOperations);
      console.log('Successfully removed bad themes.');
    } else {
      console.log('Bad themes already removed or not found.');
    }

    // 2. We also need to add Campaign level negative keywords for "piese" and "dezmembrari"
    const campaignId = '21713620073'; // PMax campaign
    const pmaxNegatives = ['piese', 'dezmembrari', 'parc dezmembrari', 'piese auto', 'rabla', 'casat'];
    
    // For PMax campaigns, negative keywords must be applied at the account level or via a negative keyword list attached to the campaign.
    // However, in newer API versions, campaignCriteria works for some negatives on PMax, or we add it to the account.
    // Let's try campaignCriteria first.
    
    const negOps = pmaxNegatives.map(w => ({
      campaign: `customers/${customerId}/campaigns/${campaignId}`,
      negative: true,
      keyword: {
        text: w,
        match_type: enums.KeywordMatchType.BROAD
      }
    }));
    
    console.log('Adding', negOps.length, 'negative keywords to PMax campaign...');
    try {
      await customer.campaignCriteria.create(negOps);
      console.log('Success adding campaign-level negatives!');
    } catch(e) {
      console.log('Could not add directly to PMax campaign (expected for some PMax types). Will add to account level instead...');
      // If PMax doesn't accept direct campaign negatives, we add them at the customer (account) level
      const accountNegOps = pmaxNegatives.map(w => ({
        customer_negative_criterion: {
          type: enums.CriterionType.KEYWORD,
          keyword: {
            text: w,
            match_type: enums.KeywordMatchType.BROAD
          }
        }
      }));
      await customer.customerNegativeCriteria.create(accountNegOps);
      console.log('Success adding account-level negatives!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
