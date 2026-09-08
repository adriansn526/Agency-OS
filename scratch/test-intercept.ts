import { chromium } from 'playwright';

async function intercept() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('response', async (res) => {
        if (res.url().includes('bolt.eu') && res.request().resourceType() === 'fetch') {
            try {
                const text = await res.text();
                if (text.includes('registration_code') || text.includes('legal_name') || text.includes('phone') || text.includes('contact_phone') || text.includes('cui') || text.includes('registration')) {
                    console.log('FOUND IN NETWORK:', res.url());
                    console.log(text.substring(0, 500));
                }
            } catch(e) {}
        }
    });

    await page.goto('https://food.bolt.eu/ro-ro/325-bucharest/p/82329-french-revolution-rosetti', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(2000);
    // Click the info button (circle with 'i')
    try {
        const infoButton = page.locator('svg').filter({ hasText: 'M12 22C17.5228 22 22 17.5228 22 12C22' }).locator('xpath=ancestor::button').first();
        if (await infoButton.isVisible()) {
            console.log('Clicking info button...');
            await infoButton.click();
            await page.waitForTimeout(3000);
        } else {
            console.log('Info button not visible.');
        }
    } catch(e) {
        console.error(e);
    }
    
    await browser.close();
}

intercept();
