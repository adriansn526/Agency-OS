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

        console.log('--- CAMPANII ---');
        const campQuery = `
            SELECT
                campaign.id,
                campaign.name,
                campaign.status,
                campaign.advertising_channel_type
            FROM campaign
            LIMIT 10
        `;
        
        const campResponse = await customer.query(campQuery);
        for (const row of campResponse) {
            console.log(`[${row.campaign.status}] ${row.campaign.name} (${row.campaign.id}) - ${row.campaign.advertising_channel_type}`);
        }

    } catch (e: any) {
        console.error('Eroare la procesare cont:', e.message, e);
    }
}

getInchideriAds();
