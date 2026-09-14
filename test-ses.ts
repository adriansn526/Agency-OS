import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import dotenv from 'dotenv';
dotenv.config({ path: 'apps/web/.env.local' });
dotenv.config({ path: 'apps/web/.env' });

const ses = new SESClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});
console.log("Access key:", process.env.AWS_ACCESS_KEY_ID);
