import { GoogleAdsApi } from 'google-ads-api';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function getInchideriAds() {
    const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET as string,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN as string,
    });

    try {
        const customerId = '5006254552'; 
        const customer = client.Customer({
            customer_id: customerId,
            refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN as string,
            login_customer_id: '6639317011',
        });

        console.log('--- CAMPANII ACTIVE ---');
        const campQuery = `
            SELECT
                campaign.id,
                campaign.name,
                campaign.status,
                campaign.advertising_channel_type,
                campaign_budget.amount_micros,
                metrics.clicks,
                metrics.impressions,
                metrics.cost_micros,
                metrics.conversions
            FROM campaign
            WHERE campaign.status = 'ENABLED'
            AND segments.date DURING LAST_30_DAYS
        `;
        
        const campResponse = await customer.query(campQuery);
        for (const row of campResponse) {
            const cost = (row.metrics.cost_micros / 1000000).toFixed(2);
            const budget = row.campaign_budget ? (row.campaign_budget.amount_micros / 1000000).toFixed(2) : '0';
            console.log(`\n[${row.campaign.id}] ${row.campaign.name} (${row.campaign.advertising_channel_type})`);
            console.log(`Buget: ${budget} lei/zi | Cost (30z): ${cost} lei | Click-uri: ${row.metrics.clicks} | Conversii: ${row.metrics.conversions}`);
        }

    } catch (e: any) {
        console.error('Eroare la procesare cont:', e.message);
    }
}

getInchideriAds();
