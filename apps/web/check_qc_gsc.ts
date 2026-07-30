import { config } from 'dotenv';
config({ path: '.env.local' });
import { google } from 'googleapis';

async function run() {
  try {
    const clientEmail = process.env.GSC_CLIENT_EMAIL;
    const privateKey = process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      throw new Error('Missing GSC credentials');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    const webmasters = google.webmasters({ version: 'v3', auth });

    console.log('Fetching sites list...');
    const sites = await webmasters.sites.list();
    const siteUrls = sites.data.siteEntry?.map(s => s.siteUrl) || [];
    
    // Filter to find qualitycontrol
    const qcSite = siteUrls.find(s => s.includes('qualitycontrol'));
    if (!qcSite) {
      console.log('Site qualitycontrol not found in GSC account.');
      console.log('Available sites:', siteUrls);
      return;
    }

    console.log('\nQuerying GSC for:', qcSite);

    const d = new Date();
    const endDate = d.toISOString().split('T')[0];
    d.setDate(d.getDate() - 90); 
    const startDate = d.toISOString().split('T')[0];

    const pagesRes = await webmasters.searchanalytics.query({
      siteUrl: qcSite,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 20,
      },
    });

    console.log('\n--- Top 20 Pages by Clicks (Last 90 Days) ---');
    console.log(JSON.stringify(pagesRes.data.rows, null, 2));

    const queriesRes = await webmasters.searchanalytics.query({
      siteUrl: qcSite,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 20,
      },
    });

    console.log('\n--- Top 20 Queries by Clicks (Last 90 Days) ---');
    console.log(JSON.stringify(queriesRes.data.rows, null, 2));
    
    const statsRes = await webmasters.searchanalytics.query({
      siteUrl: qcSite,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['date'],
        rowLimit: 90,
      },
    });
    
    console.log('\n--- Last 14 days impressions and clicks ---');
    const recentStats = statsRes.data.rows?.slice(-14) || [];
    console.log(JSON.stringify(recentStats, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
