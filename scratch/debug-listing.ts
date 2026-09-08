import { chromium } from 'playwright';

async function debugCards() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15',
        viewport: { width: 390, height: 844 },
        isMobile: true,
    });
    const page = await context.newPage();
    
    await page.goto('https://food.bolt.eu/ro-ro/325-bucharest/', { 
        waitUntil: 'domcontentloaded', timeout: 15000 
    });
    
    // Dismiss cookies
    try {
        await page.locator('button', { hasText: /(allow all|accept|permite|accepta)/i }).first().click({ timeout: 5000 });
    } catch {}
    await page.waitForTimeout(3000);

    // Get ProviderCard details
    const cards = await page.evaluate(() => {
        const cardEls = document.querySelectorAll('[data-testid="components.ProviderCard.view"]');
        return Array.from(cardEls).slice(0, 5).map(el => {
            const html = el.outerHTML.substring(0, 500);
            const text = (el as HTMLElement).innerText;
            const name = el.querySelector('[data-testid="components.ProviderCard.providerName"]');
            const rating = el.querySelector('[data-testid="components.ProviderCard.providerRatingBadge"]');
            
            // Check parent for links
            const parent = el.closest('a') || el.parentElement?.closest('a');
            const parentHref = parent ? parent.getAttribute('href') : null;
            
            // Check for any nested links
            const nestedLinks = Array.from(el.querySelectorAll('a')).map(a => a.href);
            
            // Check onclick or data attributes
            const allAttrs: Record<string, string> = {};
            for (const attr of Array.from(el.attributes)) {
                allAttrs[attr.name] = attr.value;
            }

            return {
                nameText: name?.textContent,
                ratingText: rating?.textContent,
                innerText: text.substring(0, 200),
                parentHref,
                nestedLinks,
                attrs: allAttrs,
                htmlSnippet: html,
            };
        });
    });

    console.log(JSON.stringify(cards, null, 2));
    await browser.close();
}

debugCards();
