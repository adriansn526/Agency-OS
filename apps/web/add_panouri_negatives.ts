/**
 * Add NEGATIVE keywords to "Panouri decorative" campaign
 * These terms attracted irrelevant traffic (termoizolatie/fatada/placare)
 * Product is: panouri metalice decorative decupate CNC/plasma — NOT termoizolatie
 */
import { GoogleAdsApi, enums } from 'google-ads-api';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CUSTOMER_ID = '4111955891';
const CAMPAIGN_ID = '23306999657'; // Panouri decorative
const DRY_RUN = process.env.DRY_RUN !== 'false';

// Negative keywords — termeni irelevanti (termoizolatie / fatada / placare)
const NEGATIVE_KEYWORDS: Array<{ text: string; matchType: 'BROAD' | 'PHRASE' | 'EXACT'; reason: string }> = [
  // Din analiza search terms (items 2-10 din lista anterioara)
  { text: 'panouri termoizolante polistiren decorativ', matchType: 'PHRASE', reason: '127 clicks irosite — termoizolatie EPS, nu metal' },
  { text: 'panouri termoizolante exterior',             matchType: 'PHRASE', reason: '49 clicks irosite — termoizolatie' },
  { text: 'panouri fatada exterior',                   matchType: 'PHRASE', reason: '98 clicks irosite — placaje fatada' },
  { text: 'panouri fatada',                            matchType: 'PHRASE', reason: '40 clicks irosite — placaje fatada' },
  { text: 'panouri placare exterioara',                matchType: 'PHRASE', reason: '34 clicks irosite — placare fatada' },
  { text: 'placare fatada exterior',                   matchType: 'PHRASE', reason: '9 clicks irosite — placare' },
  { text: 'placare exterior',                          matchType: 'PHRASE', reason: '11 clicks irosite — placare' },
  { text: 'placi exterior casa',                       matchType: 'PHRASE', reason: '28 clicks irosite — placi fatada' },
  { text: 'panouri decorative termoizolante exterior', matchType: 'PHRASE', reason: '9 clicks irosite — termoizolatie' },
  // Termeni generici care atrag trafic gresit (broad negatives)
  { text: 'termoizolante',                             matchType: 'BROAD',  reason: 'broad block — tot ce contine termoizolante' },
  { text: 'termoizolatie',                             matchType: 'BROAD',  reason: 'broad block — termoizolatie' },
  { text: 'polistiren',                                matchType: 'BROAD',  reason: 'broad block — polistiren EPS' },
  { text: 'vata minerala',                             matchType: 'BROAD',  reason: 'broad block — alt material izolatie' },
  { text: 'placare fatada',                            matchType: 'PHRASE', reason: 'broad block — placare fatada' },
  { text: 'dedeman',                                   matchType: 'BROAD',  reason: 'magazin concurent — traffic fara intentie' },
];

async function main() {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });

  const customer = client.Customer({
    customer_id: CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    login_customer_id: process.env.GOOGLE_ADS_MANAGER_ID,
  });

  console.log(`\nCampaign: Panouri decorative (ID: ${CAMPAIGN_ID})`);
  console.log(`Customer: ${CUSTOMER_ID}`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '🚀 LIVE — APPLYING CHANGES'}`);

  // Get existing campaign negative keywords to avoid duplicates
  const existingNeg = await customer.query(`
    SELECT campaign_criterion.keyword.text, campaign_criterion.negative
    FROM campaign_criterion
    WHERE campaign.id = ${CAMPAIGN_ID}
      AND campaign_criterion.negative = TRUE
  `).catch(() => []);

  const existingNegTexts = new Set(
    (existingNeg as any[]).map(r => r.campaign_criterion?.keyword?.text?.toLowerCase())
  );
  console.log(`\nExisting campaign negative keywords: ${existingNegTexts.size}`);

  const toAdd = NEGATIVE_KEYWORDS.filter(kw => !existingNegTexts.has(kw.text.toLowerCase()));
  const skipped = NEGATIVE_KEYWORDS.filter(kw => existingNegTexts.has(kw.text.toLowerCase()));

  if (skipped.length > 0) {
    console.log(`\n⏭️  Already exists as negative (skip):`);
    for (const kw of skipped) console.log(`   "${kw.text}"`);
  }

  console.log(`\n🚫 NEGATIVE keywords to ADD (${toAdd.length}):`);
  console.log('─'.repeat(80));
  for (const kw of toAdd) {
    console.log(`  - "${kw.text}" [${kw.matchType}]`);
    console.log(`    Motiv: ${kw.reason}`);
  }
  console.log('─'.repeat(80));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — nicio modificare nu a fost aplicată.');
    console.log('   Rulează cu DRY_RUN=false pentru a aplica efectiv.\n');
    return;
  }

  // Apply negative keywords at CAMPAIGN level
  console.log('\n🚀 Aplicare negative keywords la nivel de campanie...');

  const matchTypeMap = {
    BROAD:  enums.KeywordMatchType.BROAD,
    PHRASE: enums.KeywordMatchType.PHRASE,
    EXACT:  enums.KeywordMatchType.EXACT,
  };

  const criteriaToCreate = toAdd.map(kw => ({
    campaign: `customers/${CUSTOMER_ID}/campaigns/${CAMPAIGN_ID}`,
    negative: true,
    keyword: {
      text: kw.text,
      match_type: matchTypeMap[kw.matchType],
    },
  }));

  try {
    const result = await (customer as any).campaignCriteria.create(criteriaToCreate);
    console.log(`\n✅ SUCCESS — ${toAdd.length} negative keywords adăugate la campania "Panouri decorative"!`);
    if (Array.isArray(result)) {
      for (const r of result) {
        console.log(`   ${r?.resource_name || JSON.stringify(r)}`);
      }
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err: any) {
    console.error('\n❌ ERROR:', err?.message || err);
    if (err?.errors) console.error('Details:', JSON.stringify(err.errors, null, 2));
  }
}

main().catch(console.error);
