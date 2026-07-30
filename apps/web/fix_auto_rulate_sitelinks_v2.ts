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

    console.log('Creating new clean Sitelink...');
    const createAssetOps = [{
      type: enums.AssetType.SITELINK,
      sitelink_asset: {
        link_text: 'Cumpărăm Mașini Rulate',
        description1: 'Evaluare corectă a mașinii',
        description2: 'Plată rapidă și sigură'
      },
      final_urls: ['https://cumpar-auto-rulate.ro']
    }];
    
    const assetResp = await customer.assets.create(createAssetOps);
    const newAssetResourceName = assetResp.results[0].resource_name;
    console.log('Created new asset:', newAssetResourceName);

    console.log('Linking new sitelink to account...');
    const linkOps = [{
      asset: newAssetResourceName,
      field_type: enums.AssetFieldType.SITELINK
    }];
    await customer.customerAssets.create(linkOps);
    console.log('Successfully linked new sitelink!');

  } catch (error) {
    console.error('Error details:', error);
  }
}
run();
