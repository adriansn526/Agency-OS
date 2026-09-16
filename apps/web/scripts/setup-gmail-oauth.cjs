const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const credentialsPath = path.resolve(__dirname, 'credentials.json');

async function main() {
  if (!fs.existsSync(credentialsPath)) {
    console.log(`❌ Lipsește fișierul credentials.json!`);
    console.log(`Trebuie să descarci fișierul de client secret din Google Cloud Console.`);
    console.log(`Pasul 1: Du-te la https://console.cloud.google.com/`);
    console.log(`Pasul 2: Creează un proiect și activează Gmail API.`);
    console.log(`Pasul 3: La "Credentials", creează un "OAuth client ID" (tip Web application sau Desktop).`);
    console.log(`Pasul 4: Descarcă fișierul JSON, redenumește-l în "credentials.json" și pune-l în ${__dirname}.`);
    return;
  }

  const content = fs.readFileSync(credentialsPath, 'utf8');
  const credentials = JSON.parse(content);
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  
  if (!client_secret || !client_id) {
    console.log(`❌ Fișierul credentials.json este invalid (lipsește client_secret sau client_id).`);
    return;
  }
  const redirectUri = (redirect_uris && redirect_uris.length > 0) ? redirect_uris[0] : 'http://localhost';
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent prompt to ensure we get a refresh token
  });

  console.log('✅ Autorizează această aplicație accesând următorul URL:');
  console.log('\n', authUrl, '\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Introdu codul din acea pagină aici: ', async (code) => {
    rl.close();
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      console.log('\n=== REZULTATE ===\n');
      console.log('GMAIL_CLIENT_ID=' + client_id);
      console.log('GMAIL_CLIENT_SECRET=' + client_secret);
      console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
      
      if (!tokens.refresh_token) {
         console.warn('\n⚠️ ATENȚIE: Nu s-a returnat niciun refresh_token! Ai autorizat deja aplicația anterior? Mergi în Google Account -> Third-party apps, revocă accesul și rulează iar scriptul.');
      } else {
         console.log('\nCopiază aceste 3 rânduri în .env.local-ul tău!');
      }

      // Acum căutăm eticheta
      oAuth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
      const res = await gmail.users.labels.list({ userId: 'me' });
      const labels = res.data.labels;
      const facturiLabel = labels.find(l => l.name.toLowerCase() === 'facturi');
      
      if (facturiLabel) {
         console.log(`\nEticheta "Facturi" găsită!`);
         console.log('GMAIL_LABEL_ID=' + facturiLabel.id);
      } else {
         console.log(`\nNu am găsit eticheta "Facturi". Iată ce etichete ai:`);
         labels.forEach(l => console.log(` - ${l.name} (ID: ${l.id})`));
      }
      
    } catch (err) {
      console.error('❌ Eroare la preluarea token-ului:', err.message);
    }
  });
}

main().catch(console.error);
