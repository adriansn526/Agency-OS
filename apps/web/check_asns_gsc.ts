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
    const searchconsole = google.searchconsole({ version: 'v1', auth });

    console.log('Fetching sites list...');
    const sites = await webmasters.sites.list();
    const siteUrls = sites.data.siteEntry?.map(s => s.siteUrl) || [];
    
    // Find asns site
    const asnsSite = siteUrls.find(s => s.includes('asns.ro'));
    if (!asnsSite) {
      console.log('Site asns.ro not found in GSC account.');
      console.log('Available sites:', siteUrls);
      return;
    }

    console.log('\nQuerying GSC for:', asnsSite);

    const d = new Date();
    const endDate = d.toISOString().split('T')[0];
    d.setDate(d.getDate() - 180); // Last 6 months
    const startDate = d.toISOString().split('T')[0];

    try {
      const statsRes = await webmasters.searchanalytics.query({
        siteUrl: asnsSite,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['date'],
        },
      });
      
      const totalClicks = statsRes.data.rows?.reduce((sum, row) => sum + (row.clicks || 0), 0) || 0;
      const totalImpressions = statsRes.data.rows?.reduce((sum, row) => sum + (row.impressions || 0), 0) || 0;
      
      console.log('\n--- Performance (Last 6 Months) ---');
      console.log(`Total Clicks: ${totalClicks}`);
      console.log(`Total Impressions: ${totalImpressions}`);
      console.log('Last 5 days of data:');
      console.log(JSON.stringify(statsRes.data.rows?.slice(-5) || [], null, 2));

      const pagesRes = await webmasters.searchanalytics.query({
        siteUrl: asnsSite,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: 5,
        },
      });

      console.log('\n--- Top 5 Pages by Clicks (Last 6 Months) ---');
      console.log(JSON.stringify(pagesRes.data.rows || [], null, 2));

    } catch (e: any) {
       console.log('Error querying analytics:', e.message);
    }

    // Try URL Inspection API
    try {
        console.log('\n--- Inspecting Homepage URL ---');
        const inspectionRes = await searchconsole.urlInspection.index.inspect({
            requestBody: {
                inspectionUrl: 'https://asns.ro/',
                siteUrl: asnsSite,
                languageCode: 'ro-RO'
            }
        });
        
        console.log('Inspection Result:');
        console.log(JSON.stringify(inspectionRes.data, null, 2));
    } catch(e: any) {
        console.log('Error inspecting URL:', e.message);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
