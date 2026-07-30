import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
async function run() {
  // Try calling the REST API directly since the SDK might not list them easily
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const json = await res.json();
  if (json.models) {
    const flashModels = json.models.filter((m: any) => m.name.includes('flash')).map((m: any) => m.name);
    console.log("Available flash models:", flashModels);
  } else {
    console.log("Response:", json);
  }
}
run();
