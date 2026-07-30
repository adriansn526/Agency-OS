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

    const request = {
      customer_id: '4116802201',
      keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
      language: 'languageConstants/1000', // English
      geo_target_constants: ['geoTargetConstants/2208'], // Denmark
      keyword_seed: {
        keywords: [
          'factory audit',
          'quality control service',
          'pre shipment inspection',
          'third party inspection',
          'product inspection'
        ]
      }
    };

    console.log('Fetching keyword ideas...');
    const response = await customer.keywordPlanIdeas.generateKeywordIdeas(request);
    
    const ideas = response.map((res: any) => ({
      text: res.text,
      avg_monthly_searches: res.keyword_idea_metrics?.avg_monthly_searches || 0,
      competition: res.keyword_idea_metrics?.competition || 'UNKNOWN',
      low_bid: res.keyword_idea_metrics?.low_top_of_page_bid_micros ? +(res.keyword_idea_metrics.low_top_of_page_bid_micros / 1000000).toFixed(2) : null,
      high_bid: res.keyword_idea_metrics?.high_top_of_page_bid_micros ? +(res.keyword_idea_metrics.high_top_of_page_bid_micros / 1000000).toFixed(2) : null
    }));

    // Sort by search volume
    ideas.sort((a: any, b: any) => b.avg_monthly_searches - a.avg_monthly_searches);
    
    console.log(JSON.stringify(ideas.slice(0, 30), null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
