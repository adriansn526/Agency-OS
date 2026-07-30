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

    const campaignId = '22309675897'; // PMax Campaign #1

    // For Performance Max campaigns, Google only provides placement impressions (not clicks/cost) 
    // via the performance_max_placement_view report.
    const placementsQuery = `
      SELECT
        performance_max_placement_view.placement,
        metrics.impressions
      FROM performance_max_placement_view
      WHERE campaign.id = ${campaignId} AND segments.date DURING LAST_30_DAYS
      ORDER BY metrics.impressions DESC
      LIMIT 30
    `;
    const placements = await customer.query(placementsQuery);

    console.log('--- Top 30 Placements for Performance Max Campaign ---');
    console.log(JSON.stringify(placements, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
