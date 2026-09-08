import { chromium } from 'playwright';

async function testNextData() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://food.bolt.eu/ro-ro/325-bucharest/p/9004-burger-king-universitate/info', { waitUntil: 'domcontentloaded' });
    
    // Check if next data exists
    const nextData = await page.evaluate(() => {
        const el = document.getElementById('__NEXT_DATA__');
        return el ? JSON.parse(el.textContent || '{}') : null;
    });

    if (nextData) {
        console.log('Found __NEXT_DATA__');
        const state = nextData.props?.pageProps?.initialState;
        if (state) {
            console.log(Object.keys(state));
            // try to find provider
            const providers = state.providers;
            if (providers) {
                console.log(Object.values(providers)[0]);
            }
        }
    } else {
        console.log('No next data.');
    }
    await browser.close();
}

testNextData();
