const { google } = require('googleapis');
const fs = require('fs');

const content = fs.readFileSync('apps/web/scripts/credentials.json', 'utf8');
const credentials = JSON.parse(content);
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

const redirectUri = (redirect_uris && redirect_uris.length > 0) ? redirect_uris[0] : 'http://localhost';
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

const code = '4/0ATsMZqBqyFPSfPyFdh8s6ELTUa69J_yASPz8e0TNetbWdpD77XxjQI1k0umeO5dnlgP40A';

async function run() {
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
    
    // Acum căutăm eticheta
    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const res = await gmail.users.labels.list({ userId: 'me' });
    const labels = res.data.labels;
    const facturiLabel = labels.find(l => l.name.toLowerCase() === 'facturi');
    
    if (facturiLabel) {
       console.log('GMAIL_LABEL_ID=' + facturiLabel.id);
    } else {
       console.log('Eticheta Facturi nu a fost gasita. Creaza-o in Gmail si mai cautam. Etichete curente:');
       labels.forEach(l => console.log(` - ${l.name} (ID: ${l.id})`));
    }
  } catch(e) {
    console.error(e);
  }
}
run();
