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
    const customerId = '4111955891'; 
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const campaignId = '23306999657'; // Panouri decorative (Search)

    // 1. Fetch more search terms to see if there are other bad ones
    const searchTermsQuery = `
      SELECT
        search_term_view.search_term,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM search_term_view
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.clicks DESC
      LIMIT 30
    `;
    const searchTerms = await customer.query(searchTermsQuery);
    
    console.log('--- Extended Search Terms for "Panouri decorative" ---');
    console.log(JSON.stringify(searchTerms, null, 2));

    // 2. Add known negatives directly
    const negativeWords = ['plasa', 'plasa gard'];
    
    const negativeOperations = negativeWords.map(w => ({
      campaign: `customers/${customerId}/campaigns/${campaignId}`,
      negative: true,
      keyword: {
        text: w,
        match_type: enums.KeywordMatchType.BROAD
      }
    }));

    console.log('\nAdding negative keywords:', negativeWords.join(', '));
    const negResponse = await customer.campaignCriteria.create(negativeOperations);
    console.log('Success! Added negative keywords.');

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
