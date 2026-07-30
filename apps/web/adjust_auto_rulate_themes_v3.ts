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
      SELECT asset_group_signal.resource_name, asset_group_signal.search_theme.text
      FROM asset_group_signal
      WHERE asset_group.id = ${assetGroupId}
    `;
    const currentSignals = await customer.query(signalsQuery);

    const badThemes = ['cumpar masina', 'cumpar masina second hand'];
    
    // Deleting via the standard approach in this library
    for (const sig of currentSignals) {
      const text = (sig as any).asset_group_signal?.search_theme?.text;
      if (text && badThemes.includes(text)) {
        console.log('Removing theme:', text);
        // Using raw mutate for deletion
        await customer.mutateResources([{
          assetGroupSignalOperation: {
            remove: (sig as any).asset_group_signal.resource_name
          }
        }]);
      }
    }
    console.log('Successfully removed bad themes (if any).');

    // Add negative keywords to account level
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
