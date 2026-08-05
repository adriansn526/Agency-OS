/**
 * Run this script to register the webhook URL with OpenWA
 * Usage: node scripts/setup-openwa-webhook.js
 */

// Using Node's native --env-file


const OPENWA_API_URL = process.env.OPENWA_API_URL || 'http://localhost:2785';
const OPENWA_API_KEY = process.env.OPENWA_API_KEY;
const OPENWA_SESSION_ID = process.env.OPENWA_SESSION_ID;
const OPENWA_WEBHOOK_SECRET = process.env.OPENWA_WEBHOOK_SECRET;

// The URL where your Agency OS instance receives webhooks
const WEBHOOK_URL = 'http://127.0.0.1:3100/api/webhooks/whatsapp';

async function setupWebhook() {
  if (!OPENWA_API_KEY || !OPENWA_SESSION_ID) {
    console.error('❌ Missing OPENWA_API_KEY or OPENWA_SESSION_ID in .env.local');
    process.exit(1);
  }

  console.log(`⏳ Registering webhook for session '${OPENWA_SESSION_ID}' to ${WEBHOOK_URL}...`);

  try {
    const response = await fetch(`${OPENWA_API_URL}/api/sessions/${OPENWA_SESSION_ID}/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': OPENWA_API_KEY
      },
      body: JSON.stringify({
        url: WEBHOOK_URL,
        events: ['message.received'],
        secret: OPENWA_WEBHOOK_SECRET || ''
      })
    });

    if (response.ok) {
      console.log('✅ Webhook successfully registered!');
    } else {
      const err = await response.text();
      console.error(`❌ Failed to register webhook: ${response.status} ${response.statusText}`);
      console.error(err);
    }
  } catch (error) {
    console.error('❌ Error calling OpenWA API:', error.message);
    console.log('💡 Make sure your OpenWA server is running at', OPENWA_API_URL);
  }
}

setupWebhook();
