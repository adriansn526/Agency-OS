import dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

async function main() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    console.error("No key found");
    return;
  }
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  if (data.error) {
    console.error("Error:", data.error.message);
  } else {
    console.log("Models:", data.models.map(m => m.name).filter(n => n.includes('gemini')));
  }
}
main();
