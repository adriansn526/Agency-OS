const crypto = require('crypto');
const { Pool } = require('pg');

function decrypt(text) {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from('62b97af0f8223ab0d3b06fe7bb454781944cd8070e2f7904bc7921077d49c378', 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function main() {
  const pool = new Pool({ connectionString: "postgresql://agency_os:AgencyOS_2026!Secure@localhost:5434/agency_os?schema=public" });
  const res = await pool.query('SELECT "refreshToken" FROM "AnafSettings" LIMIT 1');
  const rToken = decrypt(res.rows[0].refreshToken);
  
  const tokenRes = await fetch('https://logincert.anaf.ro/anaf-oauth2/v1/token', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ` + Buffer.from('agency-os-client-id:client-secret-here').toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: rToken,
      token_content_type: 'jwt'
    })
  });
  // Without client ID/secret, we can't easily refresh.
  console.log(await tokenRes.text());
  pool.end();
}
main();
