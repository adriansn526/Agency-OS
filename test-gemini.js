import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });

async function main() {
  try {
    const result = await generateObject({
      model: google('gemini-3.5-flash-lite'),
      schema: z.object({ msg: z.string() }),
      prompt: 'say hello'
    });
    console.log("success", result.object);
  } catch (e) {
    console.error("failed:", e.message);
  }
}
main();
