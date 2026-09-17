import { google } from 'googleapis'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const oAuth2Client = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET)
oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })
const LABEL_ID = process.env.GMAIL_LABEL_ID

async function run() {
  const res = await gmail.users.messages.list({ userId: 'me', q: `is:read has:attachment`, labelIds: [LABEL_ID as string] })
  const msgs = res.data.messages || []
  for (const m of msgs.slice(0, 3)) { // mark just 3 as unread
    await gmail.users.messages.modify({ userId: 'me', id: m.id!, requestBody: { addLabelIds: ['UNREAD'] } })
    console.log("Marked", m.id, "as unread")
  }
}
run()
