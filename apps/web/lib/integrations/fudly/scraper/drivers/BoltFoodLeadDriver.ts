import { ScraperDriver, ScrapedLead } from '../types';
import { chromium } from 'playwright';

export class BoltFoodLeadDriver implements ScraperDriver {
    name = 'Bolt Food Lead Scraper (Playwright)';

    canHandle(url: string): boolean {
        return url.includes('food.bolt.eu') && (url.includes('/restaurants') || (!url.includes('/menu/') && !url.includes('/p/')));
    }

    async scrape(url: string, onProgress?: (msg: string) => void): Promise<ScrapedLead[]> {
        if (onProgress) onProgress(`[BoltFoodLeadDriver] Launching Playwright browser for: ${url}`);

        const browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--ignore-certificate-errors',
            ],
        });

        const scrapedLeads: ScrapedLead[] = [];

        try {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
                viewport: { width: 390, height: 844 },
                hasTouch: true,
                isMobile: true,
                geolocation: { latitude: 44.4268, longitude: 26.1025 },
                permissions: ['geolocation'],
            });

            const page = await context.newPage();

            // Block images and media to save bandwidth
            await page.route('**/*', (route) => {
                const request = route.request();
                const resourceType = request.resourceType();
                if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                    route.abort();
                } else {
                    route.continue();
                }
            });

            const isCategoryAutoLoop = url.endsWith('/search/') || url.endsWith('/search');
            let emptyCategoriesConsecutive = 0;
            const MAX_CATEGORIES = isCategoryAutoLoop ? 60 : 1;

            for (let catIndex = 1; catIndex <= MAX_CATEGORIES; catIndex++) {
                const currentUrl = isCategoryAutoLoop ? `${url}${url.endsWith('/') ? '' : '/'}?filter-cuisine=tags-${catIndex}` : url;

                if (onProgress) onProgress(`Navigating to ${currentUrl}`);

                await page.goto(currentUrl, { timeout: 45000, waitUntil: 'domcontentloaded' }).catch(() => {});

                // Accept Cookies
                try {
                    const cookieButton = page.locator('button', { hasText: /(allow all|accept|permite|accepta)/i }).first();
                    await cookieButton.click({ timeout: 5000 });
                } catch (e) {
                    // Ignore if no cookie banner
                }

                try {
                    await page.waitForSelector('[data-testid*="ProviderCard"], [data-testid*="providerListItem"]', { timeout: 15000 });
                } catch (e) {
                    if (isCategoryAutoLoop) {
                        emptyCategoriesConsecutive++;
                        if (emptyCategoriesConsecutive >= 5) break;
                        continue;
                    }
                }

                if (onProgress) onProgress("Scanning visible restaurants...");

                const CARD_SELECTOR = '[data-testid*="ProviderCard"], [data-testid*="providerListItem"]';
                let lastScrollY = -1;
                let noProgressCount = 0;
                const MAX_NO_PROGRESS = 5;

                let leadsFoundInCurrentCategory = 0;

                while (noProgressCount < MAX_NO_PROGRESS) {
                    const cardsData = await page.$$eval(CARD_SELECTOR, (elements) => {
                        return elements.map(el => {
                            const linkEl = el.hasAttribute('href') ? el : el.querySelector('[href*="/p/"]');
                            let href = linkEl ? (linkEl.getAttribute('href') || (linkEl as any).href || '') : '';
                            if (href && href.startsWith('/')) href = 'https://food.bolt.eu' + href;

                            const textContent = ((el as HTMLElement).innerText || "").split('\n').map(t => t.trim()).filter(Boolean);
                            const skipKeywords = ['sponsored', 'sponsorizat', 'livrare indisponibilă', 'livrare', 'promo', 'reducere'];

                            let name = 'Unknown';
                            if (href) {
                                const urlMatch = href.match(/\/p\/\d+-([^\/]+)/);
                                if (urlMatch && urlMatch[1]) {
                                    name = urlMatch[1].split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
                                }
                            }

                            if (name === 'Unknown') {
                                const validSpan = Array.from(el.querySelectorAll('span, div')).find(s => {
                                    const txt = s.textContent?.trim() || '';
                                    return txt.length > 2 && !skipKeywords.some(kw => txt.toLowerCase().includes(kw)) && !/^\d+[.,]?\d*$/.test(txt);
                                });
                                if (validSpan) name = validSpan.textContent!.trim();
                            }

                            let boltRating = 0;
                            let boltReviewsCount = '';
                            let isSponsored = false;
                            const deliveryTags: string[] = [];

                            textContent.forEach((text, i) => {
                                const textLower = text.toLowerCase();
                                if (textLower.includes('sponsored') || textLower.includes('sponsorizat')) isSponsored = true;
                                if (/^\d[.,]\d$/.test(text) && i + 1 < textContent.length) {
                                    boltRating = parseFloat(text.replace(',', '.'));
                                    const nextText = textContent[i + 1];
                                    if (nextText && nextText.startsWith('(') && nextText.endsWith(')')) {
                                        boltReviewsCount = nextText.replace(/[()]/g, '');
                                    }
                                }
                                if (textLower.includes('livrare') || textLower.includes('promo') || textLower.includes('reducere')) {
                                    deliveryTags.push(text);
                                }
                            });

                            return { url: href, name, boltRating, boltReviewsCount, isSponsored, deliveryTags };
                        });
                    });

                    let newCardsFound = 0;

                    for (const card of cardsData) {
                        if (!card.url) continue;
                        const existing = scrapedLeads.find(l => l.url === card.url);
                        if (!existing) {
                            scrapedLeads.push(card);
                            newCardsFound++;
                            leadsFoundInCurrentCategory++;
                        }
                    }

                    if (newCardsFound === 0) noProgressCount++;
                    else noProgressCount = 0;

                    await page.evaluate(() => window.scrollBy(0, 2000));
                    await page.waitForTimeout(1500);

                    const newScrollY = await page.evaluate(() => window.scrollY);
                    if (newScrollY === lastScrollY && newCardsFound === 0) noProgressCount += 2;
                    lastScrollY = newScrollY;
                }

                if (isCategoryAutoLoop) {
                    if (leadsFoundInCurrentCategory === 0) emptyCategoriesConsecutive++;
                    else emptyCategoriesConsecutive = 0;
                    if (emptyCategoriesConsecutive >= 5) break;
                }
            }

            if (onProgress) onProgress(`Discovery phase complete. Found ${scrapedLeads.length} restaurants. Starting enrichment via Network Interception...`);

            // Enrichment Phase
            const BATCH_SIZE = 3;
            for (let i = 0; i < scrapedLeads.length; i += BATCH_SIZE) {
                const batch = scrapedLeads.slice(i, i + BATCH_SIZE);

                await Promise.all(batch.map(async (lead) => {
                    const infoUrl = lead.url.replace(/\/+$/, '') + '/info';
                    const infoPage = await context.newPage();
                    
                    let capturedData: any = null;

                    // Listen to all network responses to capture the JSON payload
                    infoPage.on('response', async (response) => {
                        const resUrl = response.url();
                        if (resUrl.includes('bolt.eu') && response.request().resourceType() === 'fetch') {
                            try {
                                const text = await response.text();
                                if (text.includes('registration_code') || text.includes('legal_name') || text.includes('phone') || text.includes('contact_phone')) {
                                    const json = JSON.parse(text);
                                    // Deep search for provider info in JSON
                                    const searchJson = (obj: any) => {
                                        if (!obj || typeof obj !== 'object') return;
                                        if (obj.legal_name || obj.registration_code || obj.phone) {
                                            capturedData = obj;
                                            return;
                                        }
                                        Object.values(obj).forEach(val => searchJson(val));
                                    };
                                    searchJson(json);
                                }
                            } catch (e) {
                                // ignore
                            }
                        }
                    });

                    try {
                        await infoPage.goto(infoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                        
                        // If it redirects or needs interaction, we might click the info button
                        const infoButton = infoPage.locator('svg').filter({ hasText: 'M12 22C17.5228 22 22 17.5228 22 12C22' }).locator('xpath=ancestor::button').first();
                        if (await infoButton.isVisible()) {
                            await infoButton.click({ timeout: 5000 });
                        }

                        // Wait a bit to ensure the network request fires
                        await infoPage.waitForTimeout(4000);

                        // If network interception failed to find JSON, fallback to text parsing (improved regex)
                        if (!capturedData) {
                            const bodyText = await infoPage.evaluate(() => document.body.innerText);
                            
                            // Regex Fallbacks
                            const cuiMatch = bodyText.match(/(?:CUI|CIF|RO|Cod fiscal|Cod de inregistrare)[\s:-]*([A-Z0-9]{6,10})/i);
                            const phoneMatch = bodyText.match(/(?:\+40|0)\s?(?:\d\s?){9}/);
                            const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

                            lead.companyDetails = {
                                cui: cuiMatch ? cuiMatch[2] : undefined,
                            };
                            lead.phone = phoneMatch ? phoneMatch[0] : undefined;
                            lead.email = emailMatch ? emailMatch[0] : undefined;
                        } else {
                            // Map captured JSON data
                            lead.companyDetails = {
                                companyName: capturedData.legal_name || capturedData.legalName,
                                cui: capturedData.registration_code || capturedData.registrationCode,
                                companyAddress: capturedData.address || capturedData.company_address,
                            };
                            lead.phone = capturedData.phone || capturedData.contact_phone;
                            lead.email = capturedData.email || capturedData.contact_email;
                        }

                        if (onProgress) onProgress(`[${lead.name}] ✔️ ${lead.phone ? 'Phone: ' + lead.phone : 'Enriched.'}`);
                    } catch (e: any) {
                        console.error(`Error enriching ${lead.url}:`, e.message);
                    } finally {
                        await infoPage.close();
                    }
                }));
            }

        } catch (error: any) {
            console.error('[BoltFoodLeadDriver] Error:', error);
            if (onProgress) onProgress(`Fatal Error: ${error.message}`);
        } finally {
            await browser.close();
        }

        return scrapedLeads;
    }
}
