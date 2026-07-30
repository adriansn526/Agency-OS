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
    const customerId = '8836628286'; 
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || ''
    });

    const callQuery = `
      SELECT
        metrics.phone_calls,
        metrics.phone_impressions,
        segments.date
      FROM customer
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY segments.date DESC
    `;
    const callResults = await customer.query(callQuery);
    
    let callDetails = [];
    try {
      const callDetailQuery = `
        SELECT
          call_view.caller_country_code,
          call_view.caller_area_code,
          call_view.call_duration_seconds,
          call_view.start_date_time,
          call_view.end_date_time,
          call_view.call_tracking_display_location,
          call_view.type,
          call_view.call_status
        FROM call_view
        WHERE segments.date DURING LAST_30_DAYS
      `;
      callDetails = await customer.query(callDetailQuery);
    } catch(e) {
      console.log('Call view not available or no data.');
    }

    console.log('--- Phone Call Metrics ---');
    console.log(JSON.stringify(callResults.filter((r: any) => r.metrics?.phone_calls > 0), null, 2));
    
    console.log('\n--- Call Details (Call Reporting) ---');
    console.log(JSON.stringify(callDetails, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
