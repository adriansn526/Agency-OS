import { scraperService } from '../apps/web/lib/integrations/fudly/scraper/ScraperService';

async function testScraper() {
    console.log('--- Starting Scraper Test ---');
    // Using a category URL to test discovery and enrichment
    const testUrl = 'https://food.bolt.eu/ro-ro/325-bucharest/';
    
    try {
        const results = await scraperService.scrape(testUrl, (msg) => {
            console.log(`[Progress] ${msg}`);
        });

        console.log('\n--- Scraping Finished ---');
        console.log(`Found ${results.length} leads.`);
        if (results.length > 0) {
            console.log(JSON.stringify(results[0], null, 2));
        } else {
            console.log('No leads found. Ensure the URL is correct or the UI structure hasn\'t blocked it.');
        }
    } catch (e) {
        console.error('Scraper test failed:', e);
    }
}

testScraper();
