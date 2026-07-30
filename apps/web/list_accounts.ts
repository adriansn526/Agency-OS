import { GoogleAdsApi } from 'google-ads-api';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listAccounts() {
    try {
        const client = new GoogleAdsApi({
            client_id: process.env.GOOGLE_ADS_CLIENT_ID as string,
            client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET as string,
            developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN as string,
        });

        const customer = client.Customer({
            customer_id: '6639317011',
            refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN as string,
            login_customer_id: '6639317011',
        });

        const query = `
            SELECT
                customer_client.client_customer,
                customer_client.descriptive_name,
                customer_client.id
            FROM customer_client
            WHERE customer_client.level <= 1
        `;

        const response = await customer.query(query);
        
        console.log("=== LISTA CONTURI ==(");
        for (const row of response) {
            console.log(`${row.customer_client.descriptive_name}: ${row.customer_client.id}`);
        }
    } catch (e: any) {
        console.error('Eroare:', e.message);
    }
}
listAccounts();
