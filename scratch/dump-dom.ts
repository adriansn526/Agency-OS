import { chromium } from 'playwright';
import fs from 'fs';

async function dumpDom() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://food.bolt.eu/ro-ro/325-bucharest/p/82329-french-revolution-rosetti/info', { waitUntil: 'networkidle' });
    
    const html = await page.content();
    fs.writeFileSync('scratch/dump.html', html);
    
    await browser.close();
}

dumpDom();
