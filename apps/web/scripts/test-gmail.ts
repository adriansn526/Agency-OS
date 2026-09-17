import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const oAuth2Client = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET)
oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })
const LABEL_ID = process.env.GMAIL_LABEL_ID

async function run() {
  const res = await gmail.users.messages.list({ userId: 'me', q: `is:unread` })
  console.log(`Total unread:`, res.data.messages?.length || 0)
  
  const res2 = await gmail.users.messages.list({ userId: 'me', q: `is:unread has:attachment`, labelIds: [LABEL_ID as string] })
  console.log(`Total unread with label ${LABEL_ID}:`, res2.data.messages?.length || 0)
}
run().catch(console.error)
