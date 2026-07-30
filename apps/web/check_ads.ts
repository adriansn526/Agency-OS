import { config } from 'dotenv';
config({ path: '.env.local' });
import { getCampaigns, getAccountMetrics } from './lib/integrations/google-ads';

async function run() {
  try {
    const customerId = '4116802201';
    
    const d = new Date();
    d.setDate(d.getDate() - 30);
    const dateFrom = d.toISOString().split('T')[0];
    const dateTo = new Date().toISOString().split('T')[0];
    
    console.log('Account Metrics (' + dateFrom + ' to ' + dateTo + '):');
    const metrics = await getAccountMetrics(customerId, dateFrom, dateTo);
    console.log(metrics);
    
    console.log('\nCampaigns:');
    const campaigns = await getCampaigns(customerId, dateFrom, dateTo);
    console.log(JSON.stringify(campaigns, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
