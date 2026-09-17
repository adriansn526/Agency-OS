const { google } = require('googleapis');
const fs = require('fs');

const content = fs.readFileSync('apps/web/scripts/credentials.json', 'utf8');
const credentials = JSON.parse(content);
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

// Daca e Web client si redirect_uris e lipsa sau gol, folosim http://localhost
const redirectUri = (redirect_uris && redirect_uris.length > 0) ? redirect_uris[0] : 'http://localhost';

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.modify'],
  prompt: 'consent',
});

console.log("URI FOLOSIT:", redirectUri);
console.log("URL DE AUTORIZARE:\n" + authUrl);
