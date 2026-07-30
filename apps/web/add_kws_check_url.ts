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

    // 1. Check Ad URLs
    const adQuery = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.final_urls,
        ad_group_ad.status
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
        AND ad_group_ad.status != 'REMOVED'
    `;
    const ads = await customer.query(adQuery);
    console.log('--- AD URLs ---');
    ads.forEach((row: any) => {
      const ad = row.ad_group_ad?.ad;
      console.log('Ad ID:', ad?.id);
      console.log('Status:', row.ad_group_ad?.status);
      console.log('Final URLs:', JSON.stringify(ad?.final_urls));
      console.log('---');
    });

    // 2. Add New Keywords
    const newKeywords = [
      'factory audit',
      'pre shipment inspection',
      'third party inspection',
      'quality inspection company',
      'quality control service',
      '3rd party inspection companies',
      'supplier audit service'
    ];

    const operations = newKeywords.map(text => ({
      ad_group: `customers/4116802201/adGroups/${adGroupId}`,
      status: enums.AdGroupCriterionStatus.ENABLED,
      keyword: {
        text: text,
        match_type: enums.KeywordMatchType.PHRASE
      }
    }));

    console.log('\n--- ADDING NEW KEYWORDS ---');
    const createResponse = await customer.adGroupCriteria.create(operations);
    console.log(`Successfully added ${createResponse.results.length} phrase match keywords.`);

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
