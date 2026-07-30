import { config } from 'dotenv';
config({ path: '.env.local' });
import { google } from 'googleapis';
import https from 'https';

async function fetchSitemap(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
}

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

    const searchconsole = google.searchconsole({ version: 'v1', auth });

    console.log('Fetching sitemap from https://asns.ro/sitemap.xml ...');
    
    // Sometimes Next.js has sitemap.xml which points to sitemap-0.xml or has the URLs directly.
    // We'll fetch sitemap.xml and see.
    let sitemapXml = '';
    try {
        sitemapXml = await fetchSitemap('https://asns.ro/sitemap.xml');
    } catch(e) {
        console.log('Could not fetch main sitemap, trying server-sitemap.xml...');
        sitemapXml = await fetchSitemap('https://asns.ro/server-sitemap.xml');
    }

    // Extract all <loc> URLs
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    const urls: string[] = [];
    while ((match = locRegex.exec(sitemapXml)) !== null) {
      urls.push(match[1]);
    }

    const resurseUrls = urls.filter(url => url.includes('/resurse/'));
    
    if (resurseUrls.length === 0) {
        console.log('No /resurse/ URLs found in sitemap. Please verify sitemap URL.');
        // Fallback to fetch from analytics
        console.log('Fetching from GSC Analytics instead...');
        const webmasters = google.webmasters({ version: 'v3', auth });
        const d = new Date();
        const endDate = d.toISOString().split('T')[0];
        d.setDate(d.getDate() - 180);
        const startDate = d.toISOString().split('T')[0];

        const pagesRes = await webmasters.searchanalytics.query({
            siteUrl: 'sc-domain:asns.ro',
            requestBody: {
            startDate,
            endDate,
            dimensions: ['page'],
            rowLimit: 50,
            },
        });
        const allPages = pagesRes.data.rows?.map(r => r.keys?.[0]) || [];
        const analyticsResurse = allPages.filter(p => p?.includes('/resurse/'));
        resurseUrls.push(...(analyticsResurse as string[]));
    }

    console.log(`Found ${resurseUrls.length} resource URLs to check.`);

    // Check up to 15 URLs to avoid rate limits / taking too long
    const urlsToCheck = resurseUrls.slice(0, 15);
    
    for (const url of urlsToCheck) {
        try {
            console.log(`\nInspecting: ${url}`);
            const res = await searchconsole.urlInspection.index.inspect({
                requestBody: {
                    inspectionUrl: url,
                    siteUrl: 'sc-domain:asns.ro',
                    languageCode: 'ro-RO'
                }
            });
            const status = res.data.inspectionResult?.indexStatusResult;
            console.log(`Verdict: ${status?.verdict}`);
            console.log(`Coverage: ${status?.coverageState}`);
            if (status?.lastCrawlTime) {
                console.log(`Last Crawled: ${status.lastCrawlTime}`);
            }
        } catch(e: any) {
            console.log(`Error inspecting ${url}: ${e.message}`);
        }
        // Small delay to avoid quota issues
        await new Promise(r => setTimeout(r, 1000));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}
run();
