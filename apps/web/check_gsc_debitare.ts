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

    // 1. List sites to check exact URL
    console.log('Fetching sites list...');
    const sites = await webmasters.sites.list();
    const siteUrls = sites.data.siteEntry?.map(s => s.siteUrl) || [];
    console.log('Available sites:', siteUrls);

    // Filter to find debitare-plasma
    const debitareSite = siteUrls.find(s => s.includes('debitare-plasma.ro'));
    if (!debitareSite) {
      console.log('Site debitare-plasma.ro not found in GSC account.');
      return;
    }

    console.log('\nQuerying GSC for:', debitareSite);

    // 2. Query top pages
    const d = new Date();
    const endDate = d.toISOString().split('T')[0];
    d.setDate(d.getDate() - 90); // last 90 days for better organic data
    const startDate = d.toISOString().split('T')[0];

    const pagesRes = await webmasters.searchanalytics.query({
      siteUrl: debitareSite,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['page'],
        rowLimit: 10,
      },
    });

    console.log('\n--- Top 10 Pages by Clicks (Last 90 Days) ---');
    console.log(JSON.stringify(pagesRes.data.rows, null, 2));

    // 3. Query top queries
    const queriesRes = await webmasters.searchanalytics.query({
      siteUrl: debitareSite,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 15,
      },
    });

    console.log('\n--- Top 15 Queries by Clicks (Last 90 Days) ---');
    console.log(JSON.stringify(queriesRes.data.rows, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
