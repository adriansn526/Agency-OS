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

    const assetGroupId = '6517896764'; 

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
          resource_name: sig.asset_group_signal.resource_name
        });
      }
    });

    console.log('Removing', removeOperations.length, 'bad search themes...');
    if (removeOperations.length > 0) {
      // For google-ads-api library, delete operations use .delete() or are passed as array of strings
      const resourceNames = removeOperations.map(op => op.resource_name);
      await customer.assetGroupSignals.delete(resourceNames);
      console.log('Successfully removed bad themes.');
    } else {
      console.log('Bad themes already removed or not found.');
    }

    const campaignId = '21713620073'; // PMax campaign
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
