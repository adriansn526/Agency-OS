/**
 * Batch Discovery Script - Bolt Food București
 * 
 * Iterează sistematic prin toate categoriile de pe Bolt Food
 * pentru a aduna cât mai multe restaurante unice.
 * Compară cu lead-urile existente din MongoDB și raportează 
 * câte sunt noi vs. deja în bază.
 */
import { chromium } from 'playwright';
import { MongoClient } from 'mongodb';

interface DiscoveredLead {
    url: string;
    name: string;
    boltRating: number;
    boltReviewsCount: string;
    isSponsored: boolean;
    deliveryTags: string[];
}

async function batchDiscovery() {
    // 1. Load existing URLs from MongoDB
    const mongo = new MongoClient('mongodb://localhost:27017');
    await mongo.connect();
    const db = mongo.db('fudly');
    const existingUrls = new Set(
        (await db.collection('leads').find({}, { projection: { url: 1 } }).toArray())
            .map(l => l.url.replace(/\/+$/, ''))
    );
    console.log(`[DB] ${existingUrls.size} existing leads in MongoDB`);

    // 2. Launch Playwright
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        viewport: { width: 390, height: 844 },
        isMobile: true,
    });

    const page = await context.newPage();

    // Block heavy resources
    await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    const allDiscovered = new Map<string, DiscoveredLead>();
    const BASE = 'https://food.bolt.eu/ro-ro/325-bucharest/';
    const CARD_SELECTOR = '[data-testid="components.ProviderCard.view"]';
    
    // Also try the main category pages Bolt exposes
    const categoryPaths = [
        '', // main page
        'c/fast-food/',
        'c/pizza/',
        'c/sushi/',
        'c/coffee/',
        'c/burgeri/',
        'c/shaorma/',
        'c/paste/',
        'c/deserturi/',
        'c/bauturi/',
        'c/mic-dejun/',
        'c/salate/',
        'c/grocery/',
    ];
    
    // Plus filter-based categories (tags-1 through tags-50)
    const MAX_TAG_CATEGORIES = 50;
    let emptyConsecutive = 0;

    // Phase A: Named categories
    for (const catPath of categoryPaths) {
        const url = BASE + catPath;
        console.log(`\n[CAT] ${url}`);
        const found = await scrapeListPage(page, url, CARD_SELECTOR, allDiscovered);
        console.log(`  -> Found ${found} new (total unique: ${allDiscovered.size})`);
    }

    // Phase B: Tag-based categories
    for (let tag = 1; tag <= MAX_TAG_CATEGORIES; tag++) {
        const url = `${BASE}?filter-cuisine=tags-${tag}`;
        console.log(`\n[TAG ${tag}] ${url}`);
        const found = await scrapeListPage(page, url, CARD_SELECTOR, allDiscovered);
        console.log(`  -> Found ${found} new (total unique: ${allDiscovered.size})`);
        
        if (found === 0) {
            emptyConsecutive++;
            if (emptyConsecutive >= 5) {
                console.log(`[STOP] 5 consecutive empty tag categories, stopping.`);
                break;
            }
        } else {
            emptyConsecutive = 0;
        }
    }

    await browser.close();

    // 3. Compare with existing
    let newCount = 0;
    let existingCount = 0;
    const newLeads: DiscoveredLead[] = [];

    for (const [url, lead] of allDiscovered) {
        const normalized = url.replace(/\/+$/, '');
        if (existingUrls.has(normalized)) {
            existingCount++;
        } else {
            newCount++;
            newLeads.push(lead);
        }
    }

    console.log(`\n========== RESULTS ==========`);
    console.log(`Total discovered: ${allDiscovered.size}`);
    console.log(`Already in DB:    ${existingCount}`);
    console.log(`NEW leads:        ${newCount}`);

    // 4. Insert new leads into MongoDB
    if (newLeads.length > 0) {
        const docs = newLeads.map(l => ({
            name: l.name,
            url: l.url,
            status: 'NEW',
            city: 'București',
            boltRating: l.boltRating,
            boltReviewsCount: l.boltReviewsCount,
            isSponsored: l.isSponsored,
            deliveryTags: l.deliveryTags,
            enrichmentStatus: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
        }));

        const result = await db.collection('leads').insertMany(docs, { ordered: false }).catch(e => {
            console.log(`Insert warning (some may be duplicates): ${e.message}`);
            return { insertedCount: 0 };
        });
        console.log(`Inserted ${result.insertedCount} new leads into MongoDB`);
    }

    // 5. Print sample of new high-value leads
    const highValue = newLeads
        .filter(l => parseInt(l.boltReviewsCount.replace(/[^0-9]/g, '')) >= 150 || l.isSponsored)
        .slice(0, 20);
    
    if (highValue.length > 0) {
        console.log(`\n--- Top new high-value leads ---`);
        highValue.forEach(l => {
            console.log(`  ${l.name} | ${l.boltReviewsCount} reviews | Rating ${l.boltRating} | Sponsored: ${l.isSponsored}`);
        });
    }

    await mongo.close();
}

async function scrapeListPage(
    page: any,
    url: string,
    cardSelector: string,
    allDiscovered: Map<string, DiscoveredLead>
): Promise<number> {
    try {
        await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });
    } catch {
        return 0;
    }

    // Dismiss cookies
    try {
        await page.locator('button', { hasText: /(allow all|accept|permite|accepta)/i }).first().click({ timeout: 3000 });
    } catch {}

    // Wait for cards
    try {
        await page.waitForSelector(cardSelector, { timeout: 10000 });
    } catch {
        return 0;
    }

    // Extra wait for content to hydrate
    await page.waitForTimeout(2000);

    let newFound = 0;
    let noProgress = 0;
    let lastScrollY = -1;

    while (noProgress < 5) {
        const cards = await page.$$eval(cardSelector, (elements: any[]) => {
            return elements.map((el: any) => {
                // Find the link/button with href containing /p/
                const linkEl = el.hasAttribute('href') ? el : el.querySelector('[href*="/p/"]');
                let href = linkEl ? (linkEl.getAttribute('href') || '') : '';
                if (href && href.startsWith('/')) href = 'https://food.bolt.eu' + href;
                if (!href || !href.includes('/p/')) return null;

                const textContent = ((el as HTMLElement).innerText || "").split('\n').map((t: string) => t.trim()).filter(Boolean);

                // Name from providerName testid first, then URL fallback
                const nameEl = el.querySelector('[data-testid="components.ProviderCard.providerName"]');
                let name = nameEl ? nameEl.textContent.trim() : 'Unknown';
                if (name === 'Unknown') {
                    const urlMatch = href.match(/\/p\/\d+-([^/]+)/);
                    if (urlMatch && urlMatch[1]) {
                        name = urlMatch[1].split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                    }
                }

                let boltRating = 0;
                let boltReviewsCount = '';
                let isSponsored = false;

                textContent.forEach((text: string, i: number) => {
                    const textLower = text.toLowerCase();
                    if (textLower.includes('sponsored') || textLower.includes('sponsorizat')) isSponsored = true;
                    if (/^\d[.,]\d$/.test(text) && i + 1 < textContent.length) {
                        boltRating = parseFloat(text.replace(',', '.'));
                        const nextText = textContent[i + 1];
                        if (nextText && nextText.startsWith('(') && nextText.endsWith(')')) {
                            boltReviewsCount = nextText.replace(/[()]/g, '');
                        }
                    }
                });

                return { url: href, name, boltRating, boltReviewsCount, isSponsored, deliveryTags: [] as string[] };
            }).filter(Boolean);
        });

        let batchNew = 0;
        for (const card of cards) {
            if (!card || !card.url) continue;
            const key = card.url.replace(/\/+$/, '');
            if (!allDiscovered.has(key)) {
                allDiscovered.set(key, card);
                batchNew++;
                newFound++;
            }
        }

        if (batchNew === 0) noProgress++;
        else noProgress = 0;

        await page.evaluate(() => window.scrollBy(0, 2000));
        await page.waitForTimeout(1500);

        const scrollY = await page.evaluate(() => window.scrollY);
        if (scrollY === lastScrollY && batchNew === 0) noProgress += 2;
        lastScrollY = scrollY;
    }

    return newFound;
}

batchDiscovery().catch(console.error);
