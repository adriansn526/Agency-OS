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
    const customer = client.Customer({
      customer_id: '4116802201',
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
      login_customer_id: '6639317011'
    });

    const adGroupId = '200013404561';
    
    // In Google Ads API, modifying an ad is not allowed. We have to create a new ad and pause the old one.
    // Let's fetch the existing ad details so we can clone it.
    const adQuery = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group_ad.ad.responsive_search_ad.descriptions
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId} AND ad_group_ad.status = 'ENABLED'
    `;
    const ads = await customer.query(adQuery);
    
    if (ads.length === 0) {
      console.log('No enabled ads found.');
      return;
    }

    const oldAd = ads[0].ad_group_ad.ad;
    
    if (!oldAd.responsive_search_ad) {
      console.log('Ad is not a Responsive Search Ad. Needs manual handling.');
      return;
    }

    // Create the new ad
    console.log('Creating new ad with EN URL...');
    const createOp = [{
      ad_group: `customers/4116802201/adGroups/${adGroupId}`,
      status: enums.AdGroupAdStatus.ENABLED,
      ad: {
        final_urls: ['https://qualitycontrol.com.ro/en'],
        responsive_search_ad: {
          headlines: oldAd.responsive_search_ad.headlines,
          descriptions: oldAd.responsive_search_ad.descriptions
        }
      }
    }];
    
    const createResp = await customer.adGroupAds.create(createOp);
    console.log('New Ad Created!');

    // Pause the old ad
    console.log('Pausing old ad...');
    const pauseOp = [{
      resource_name: `customers/4116802201/adGroupAds/${adGroupId}~${oldAd.id}`,
      status: enums.AdGroupAdStatus.PAUSED
    }];
    await customer.adGroupAds.update(pauseOp);
    console.log('Old Ad Paused!');

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
