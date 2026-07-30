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
    const customerId = '4111955891'; 
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const campaignId = '22949216152'; // Debitare Laser

    // Check search terms
    const searchTermsQuery = `
      SELECT
        search_term_view.search_term,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM search_term_view
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
    `;
    const searchTerms = await customer.query(searchTermsQuery);

    // Check keywords configured
    const keywordsQuery = `
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM keyword_view
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
    `;
    const keywords = await customer.query(keywordsQuery);

    // Check ads and their final URLs
    const adsQuery = `
      SELECT
        ad_group_ad.ad.final_urls,
        ad_group_ad.status,
        metrics.clicks,
        metrics.impressions
      FROM ad_group_ad
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
    `;
    const ads = await customer.query(adsQuery);

    console.log('--- DEBITARE LASER CAMPAIGN DETAILS ---');
    console.log('Search Terms:', JSON.stringify(searchTerms, null, 2));
    console.log('\nKeywords:', JSON.stringify(keywords, null, 2));
    console.log('\nAds (URLs):', JSON.stringify(ads, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

run();
