/**
 * Batch Enrichment Script (Prioritized)
 * 
 * Fetches leads from MongoDB where enrichmentStatus === 'PENDING'.
 * Filters them based on strict business criteria:
 * - Volume: >= 150 reviews
 * - Sponsored: true
 * - Quality: >= 50 reviews AND rating >= 4.5
 * 
 * Uses Playwright network interception to extract CUI, Phone, Email from /info pages.
 */
import { chromium } from 'playwright';
import { MongoClient, ObjectId } from 'mongodb';

async function runEnrichment() {
    console.log('[ENRICH] Conectare la MongoDB...');
    const mongo = new MongoClient('mongodb://localhost:27017');
    await mongo.connect();
    const db = mongo.db('fudly');
    const leadsCollection = db.collection('leads');

    // 1. Fetch pending leads
    const pendingLeads = await leadsCollection.find({ enrichmentStatus: 'PENDING' }).toArray();
    console.log(`[ENRICH] Găsite ${pendingLeads.length} lead-uri PENDING în total.`);

    // 2. Filter prioritized leads
    const prioritizedLeads = pendingLeads.filter(l => {
        const revString = typeof l.boltReviewsCount === 'string' ? l.boltReviewsCount : '';
        const rev = parseInt(revString.replace(/[^0-9]/g, '')) || 0;
        const rating = typeof l.boltRating === 'number' ? l.boltRating : parseFloat(l.boltRating || '0');

        return rev >= 150 || l.isSponsored === true || (rev >= 50 && rating >= 4.5);
    });

    console.log(`[ENRICH] Filtrate pe baza criteriilor: ${prioritizedLeads.length} lead-uri prioritizate.`);

    if (prioritizedLeads.length === 0) {
        console.log('[ENRICH] Nu există lead-uri care îndeplinesc criteriile. Ieșire.');
        await mongo.close();
        return;
    }

    // 3. Setup Playwright
    console.log('[ENRICH] Pornire Playwright...');
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
    });

    // Blocăm resurse ne-necesare pentru viteză, DAR permitem scripts/fetch pentru a prinde JSON-ul
    const blockPage = await context.newPage();
    await context.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });
    await blockPage.close();

    const BATCH_SIZE = 5;
    let processed = 0;
    let successful = 0;

    for (let i = 0; i < prioritizedLeads.length; i += BATCH_SIZE) {
        const batch = prioritizedLeads.slice(i, i + BATCH_SIZE);
        console.log(`[ENRICH] Procesez lotul ${i / BATCH_SIZE + 1} (${i} - ${i + batch.length} din ${prioritizedLeads.length})...`);

        await Promise.all(batch.map(async (lead) => {
            const infoPage = await context.newPage();
            let infoUrl = lead.url.replace(/\/+$/, '');
            if (!infoUrl.endsWith('/info')) {
                 infoUrl += '/info/';
            } else {
                 infoUrl += '/';
            }

            let capturedData: any = null;
            let enrichmentSuccess = false;

            // Network interception for JSON payloads
            infoPage.on('response', async (response) => {
                const resUrl = response.url();
                if (resUrl.includes('bolt.eu') && response.request().resourceType() === 'fetch') {
                    try {
                        const text = await response.text();
                        if (text.includes('registration_code') || text.includes('legal_name') || text.includes('phone')) {
                            const json = JSON.parse(text);
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
                        // ignore unparseable
                    }
                }
            });

            try {
                await infoPage.goto(infoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                // Click info button if it's rendered visually
                try {
                    const infoButton = infoPage.locator('svg').filter({ hasText: 'M12 22C17.5228 22 22 17.5228 22 12C22' }).locator('xpath=ancestor::button').first();
                    if (await infoButton.isVisible()) {
                        await infoButton.click({ timeout: 3000 });
                    }
                } catch(e) {}

                // Așteptăm pentru load
                await infoPage.waitForTimeout(4000);

                const updateData: any = {
                    updatedAt: new Date()
                };

                if (!capturedData) {
                    // Fallback Regex
                    const bodyText = await infoPage.evaluate(() => document.body.innerText);
                    const cuiMatch = bodyText.match(/(?:CUI|CIF|RO|Cod fiscal|Cod de inregistrare)[\s:-]*([A-Z0-9]{6,10})/i);
                    const phoneMatch = bodyText.match(/(?:\+40|0)\s?(?:\d\s?){9}/);
                    const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

                    if (cuiMatch) updateData['companyDetails.cui'] = cuiMatch[1];
                    if (phoneMatch) updateData['contact.phone'] = phoneMatch[0];
                    if (emailMatch) updateData['contact.email'] = emailMatch[0];

                    if (cuiMatch || phoneMatch) enrichmentSuccess = true;
                } else {
                    // Mapped from JSON
                    updateData['companyDetails.companyName'] = capturedData.legal_name || capturedData.legalName;
                    updateData['companyDetails.cui'] = capturedData.registration_code || capturedData.registrationCode;
                    updateData['companyDetails.companyAddress'] = capturedData.address || capturedData.company_address;
                    updateData['contact.phone'] = capturedData.phone || capturedData.contact_phone;
                    updateData['contact.email'] = capturedData.email || capturedData.contact_email;
                    
                    enrichmentSuccess = !!(updateData['companyDetails.cui'] || updateData['contact.phone']);
                }

                updateData.enrichmentStatus = enrichmentSuccess ? 'SUCCESS' : 'FAILED';
                
                // Salvare în MongoDB
                await leadsCollection.updateOne(
                    { _id: lead._id },
                    { $set: updateData }
                );

                processed++;
                if (enrichmentSuccess) {
                    successful++;
                    console.log(`   ✔️ [${lead.name}] CUI: ${updateData['companyDetails.cui'] || '-'}, Telefon: ${updateData['contact.phone'] || '-'}`);
                } else {
                    console.log(`   ❌ [${lead.name}] Nu s-au găsit date.`);
                }

            } catch (error: any) {
                console.log(`   ⚠️ [${lead.name}] Eroare: ${error.message}`);
                await leadsCollection.updateOne(
                    { _id: lead._id },
                    { $set: { enrichmentStatus: 'ERROR', updatedAt: new Date() } }
                );
            } finally {
                await infoPage.close();
            }
        }));
    }

    console.log(`\n========== ENRICHMENT COMPLET ==========`);
    console.log(`Total procesate: ${processed} din ${prioritizedLeads.length}`);
    console.log(`Succes: ${successful}`);
    
    await browser.close();
    await mongo.close();
}

runEnrichment().catch(console.error);
