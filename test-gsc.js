const { google } = require('googleapis');
require('dotenv').config({ path: 'apps/web/.env.local' });

async function main() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GSC_CLIENT_EMAIL,
        private_key: process.env.GSC_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    
    console.log("Fetching sites...");
    const response = await searchconsole.sites.list();
    console.log("Sites authorized for this Service Account:");
    if (response.data.siteEntry) {
      response.data.siteEntry.forEach(site => {
        console.log(`- ${site.siteUrl} (${site.permissionLevel})`);
      });
    } else {
      console.log("No sites found. The service account has not been added to any GSC properties.");
    }
  } catch(e) {
    console.error("Error:", e.message);
  }
}
main();
