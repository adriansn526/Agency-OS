import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleAdsApi } from 'google-ads-api';

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
    
    // In Google Ads API, modifying an ad directly is not fully supported for all fields.
    // The standard way to update an ad URL is usually to mutate the Ad.
    // But since responsive search ads are complex, it's safer to update the ad_group_ad final_urls.
    
    const adQuery = `
      SELECT ad_group_ad.ad.id
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId} AND ad_group_ad.status = 'ENABLED'
    `;
    const ads = await customer.query(adQuery);
    
    if (ads.length === 0) {
      console.log('No enabled ads found.');
      return;
    }

    const operations = ads.map((row: any) => ({
      update: {
        resource_name: `customers/4116802201/adGroupAds/${adGroupId}~${row.ad_group_ad.ad.id}`,
        ad: {
          final_urls: ['https://qualitycontrol.com.ro/en']
        }
      }
    }));

    console.log('Updating URL for', operations.length, 'ads...');
    const response = await customer.adGroupAds.mutate(operations);
    console.log('Success!', JSON.stringify(response.results, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
