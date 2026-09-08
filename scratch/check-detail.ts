import { chromium } from 'playwright';

async function getExactReviews() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('https://food.bolt.eu/ro-ro/325-bucharest/p/32876-shaormeria-ca-izvor/', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
    });
    await page.waitForTimeout(4000);
    
    const data = await page.evaluate(() => {
        const body = document.body.innerText;
        const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const relevant = lines.filter(l => 
            /\d[.,]\d/.test(l) ||
            /recenz/i.test(l) ||
            /review/i.test(l) ||
            /\(\d/.test(l) ||
            /rating/i.test(l)
        );
        return { relevant, first30Lines: lines.slice(0, 30) };
    });
    
    console.log('Relevant lines:', JSON.stringify(data.relevant, null, 2));
    console.log('\nFirst 30 lines:', JSON.stringify(data.first30Lines, null, 2));
    
    await browser.close();
}

getExactReviews();
