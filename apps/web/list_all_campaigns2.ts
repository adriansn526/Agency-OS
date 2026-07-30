import { GoogleAdsApi } from 'google-ads-api';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listAllCampaigns() {
    const client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID as string,
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET as string,
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN as string,
    });

    const accounts = ['6639317011', '2116589696', '9427522174', '5107481194', '3396990605', '4116802201', '6816852796', '2581621115', '2484281813', '5902722442'];

    for (const accId of accounts) {
        console.log(`\n--- Cont ${accId} ---`);
        try {
            const customer = client.Customer({
                customer_id: accId,
                refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN as string,
                login_customer_id: '6639317011',
            });

            const query = `
                SELECT
                    campaign.id,
                    campaign.name,
                    campaign.status
                FROM campaign
            `;

            const response = await customer.query(query);
            for (const row of response) {
                console.log(`- [${row.campaign.status}] ${row.campaign.name} (${row.campaign.id})`);
            }
        } catch (e: any) {
            console.error(`Eroare pt ${accId}:`, e.message);
        }
    }
}
listAllCampaigns();
