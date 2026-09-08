import { NextRequest, NextResponse } from 'next/server';
import { scraperService } from '@/lib/integrations/fudly/scraper/ScraperService';
import { db } from '@repo/db';

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const fudlyBL = await db.businessLine.findUnique({ where: { slug: 'fudly' } });
        if (!fudlyBL) {
            return NextResponse.json({ error: 'Fudly business line not found' }, { status: 404 });
        }

        const scrapedLeads = await scraperService.scrape(url, (msg) => {
            console.log(`[Scraper] ${msg}`);
        });

        // Map to DB Lead format
        const mappedLeads = scrapedLeads.map(lead => {
            // Generate a fake external ID if we don't have one from MongoDB anymore
            const externalId = Buffer.from(lead.url).toString('base64');
            
            return {
                businessLineId: fudlyBL.id,
                entityType: 'restaurants',
                companyName: lead.companyDetails?.companyName || lead.name || 'N/A',
                contactPerson: lead.name,
                email: lead.email || null,
                phone: lead.phone || null,
                status: 'nou',
                source: 'boltfood_playwright',
                value: 59,
                probability: 30,
                priority: 'medium',
                externalId,
                externalSource: 'fudly_playwright',
                address: lead.companyDetails?.companyAddress || lead.address || null,
                customFields: {
                    bolt_rating: lead.boltRating || null,
                    bolt_reviews: lead.boltReviewsCount || null,
                    bolt_sponsored: lead.isSponsored || false,
                    bolt_url: lead.url,
                    delivery_tags: lead.deliveryTags || [],
                    cui: lead.companyDetails?.cui || null,
                    reg_com: lead.companyDetails?.regCom || null,
                    sediu_social: lead.companyDetails?.companyAddress || null,
                    imported_at: new Date().toISOString(),
                }
            };
        });

        // Insert into Postgres directly
        let imported = 0;
        if (mappedLeads.length > 0) {
            // Chunk insertion
            const chunkSize = 50;
            for (let i = 0; i < mappedLeads.length; i += chunkSize) {
                const chunk = mappedLeads.slice(i, i + chunkSize);
                await db.lead.createMany({ data: chunk as any, skipDuplicates: true });
                imported += chunk.length;
            }
        }

        return NextResponse.json({
            success: true,
            totalScraped: scrapedLeads.length,
            imported,
            sample: mappedLeads.slice(0, 3)
        });

    } catch (error: any) {
        console.error('Scrape API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
