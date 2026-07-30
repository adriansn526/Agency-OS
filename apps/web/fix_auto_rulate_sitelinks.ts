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

    // 1. Fetch disapproved Sitelink Assets
    const sitelinksQuery = `
      SELECT
        asset.id,
        asset.name,
        asset.sitelink_asset.link_text,
        asset.policy_summary.approval_status
      FROM asset
      WHERE asset.type = 'SITELINK'
        AND asset.policy_summary.approval_status = 'DISAPPROVED'
    `;
    const disapprovedAssets = await customer.query(sitelinksQuery);
    
    console.log('Found disapproved sitelinks:', disapprovedAssets.length);

    if (disapprovedAssets.length > 0) {
      // 2. We can't delete assets that are linked. We must find the CustomerAsset link and remove it.
      for (const asset of disapprovedAssets) {
        const assetId = (asset as any).asset.id;
        console.log(`Removing link for asset ${assetId}...`);
        
        // Find customer asset links
        const caQuery = `
          SELECT customer_asset.asset, customer_asset.field_type
          FROM customer_asset
          WHERE asset.id = ${assetId}
        `;
        const customerAssets = await customer.query(caQuery);
        
        if (customerAssets.length > 0) {
          for (const ca of customerAssets) {
            try {
              // Usually the format is customers/CID/customerAssets/ASSET_ID~FIELD_TYPE
              // The API will return resource_name. Wait, customer_asset.resource_name isn't in the query above.
              // Let's re-query to get the exact resource_name
              const exactQuery = `SELECT customer_asset.resource_name FROM customer_asset WHERE asset.id = ${assetId}`;
              const exactLinks = await customer.query(exactQuery);
              for (const link of exactLinks) {
                const resourceName = (link as any).customer_asset.resource_name;
                console.log('Removing customer asset link:', resourceName);
                await customer.mutateResources([{
                  customerAssetOperation: {
                    remove: resourceName
                  }
                }]);
              }
            } catch(e) {
              console.log('Failed to remove link. Moving on.');
            }
          }
        }
      }
    }

    // 3. Create a clean new Sitelink
    console.log('Creating new clean Sitelink...');
    const createAssetOp = [{
      assetOperation: {
        create: {
          type: enums.AssetType.SITELINK,
          sitelink_asset: {
            link_text: 'Cumpărăm Mașini Rulate',
            description1: 'Evaluare corectă a mașinii',
            description2: 'Plată rapidă și sigură'
          },
          final_urls: ['https://cumpar-auto-rulate.ro']
        }
      }
    }];
    
    const assetResp = await customer.mutateResources(createAssetOp);
    const newAssetResourceName = assetResp.mutate_operation_responses[0].asset_result.resource_name;
    console.log('Created new asset:', newAssetResourceName);

    // 4. Link the new Sitelink to the Customer (Account level)
    console.log('Linking new sitelink to account...');
    const linkOp = [{
      customerAssetOperation: {
        create: {
          asset: newAssetResourceName,
          field_type: enums.AssetFieldType.SITELINK
        }
      }
    }];
    await customer.mutateResources(linkOp);
    console.log('Successfully linked new sitelink!');

  } catch (error) {
    console.error('Error details:', error);
  }
}
run();
