/**
 * DRY RUN — Preview keywords to be added to "Panouri decorative" campaign
 * Run with DRY_RUN=true to preview, DRY_RUN=false to actually apply
 */
import { GoogleAdsApi, enums } from 'google-ads-api';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CUSTOMER_ID = '4111955891';
const CAMPAIGN_ID = '23306999657'; // Panouri decorative
const DRY_RUN = process.env.DRY_RUN !== 'false'; // default: dry run

// Keywords to add (from top search terms with conversions / high CTR)
const NEW_KEYWORDS: Array<{ text: string; matchType: 'PHRASE' | 'EXACT'; bidMicros?: number; reason: string }> = [
  { text: 'panouri de fatada',                             matchType: 'PHRASE', bidMicros: 800_000,  reason: '194 clicks, 2 conv, RON127 spend — top termen' },
  { text: 'panouri termoizolante polistiren decorativ',    matchType: 'PHRASE', bidMicros: 700_000,  reason: '127 clicks, 5 conv — cel mai bun conv rate' },
  { text: 'panouri termoizolante exterior',                matchType: 'PHRASE', bidMicros: 750_000,  reason: '49 clicks, 3 conv' },
  { text: 'panouri fatada exterior',                       matchType: 'PHRASE', bidMicros: 700_000,  reason: '98 clicks, 1 conv, CTR 66%' },
  { text: 'panouri fatada',                                matchType: 'PHRASE', bidMicros: 650_000,  reason: '40 clicks, 1 conv' },
  { text: 'panouri placare exterioara',                    matchType: 'PHRASE', bidMicros: 700_000,  reason: '34 clicks, 1 conv, CTR 75%' },
  { text: 'placare fatada exterior',                       matchType: 'PHRASE', bidMicros: 800_000,  reason: '9 clicks, 1 conv, CTR 69%' },
  { text: 'placare exterior',                              matchType: 'PHRASE', bidMicros: 650_000,  reason: '11 clicks, 1 conv' },
  { text: 'placi exterior casa',                           matchType: 'PHRASE', bidMicros: 600_000,  reason: '28 clicks, CTR 70%' },
  { text: 'panouri decorative termoizolante exterior',     matchType: 'PHRASE', bidMicros: 700_000,  reason: '9 clicks, CTR 60%' },
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

  // Get ad group ID
  const agRes = await customer.query(`
    SELECT ad_group.id, ad_group.name
    FROM ad_group
    WHERE campaign.id = ${CAMPAIGN_ID}
    LIMIT 5
  `);

  if (agRes.length === 0) {
    console.error('No ad groups found for this campaign!');
    return;
  }

  const adGroupId = (agRes[0].ad_group as any).id;
  const adGroupName = (agRes[0].ad_group as any).name;
  console.log(`\nAd Group: "${adGroupName}" (ID: ${adGroupId})`);
  console.log(`Campaign: Panouri decorative (ID: ${CAMPAIGN_ID})`);
  console.log(`Customer: ${CUSTOMER_ID}`);
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '🚀 LIVE — APPLYING CHANGES'}`);

  // Get existing keywords to avoid duplicates
  const existingKws = await customer.query(`
    SELECT ad_group_criterion.keyword.text
    FROM keyword_view
    WHERE ad_group.id = ${adGroupId}
  `);
  const existingTexts = new Set(
    existingKws.map((r: any) => r.ad_group_criterion?.keyword?.text?.toLowerCase())
  );
  console.log(`\nExisting keywords: ${existingTexts.size}`);

  // Filter out duplicates
  const toAdd = NEW_KEYWORDS.filter(kw => !existingTexts.has(kw.text.toLowerCase()));
  const skipped = NEW_KEYWORDS.filter(kw => existingTexts.has(kw.text.toLowerCase()));

  if (skipped.length > 0) {
    console.log(`\n⏭️  Already exists (will skip):`);
    for (const kw of skipped) console.log(`   "${kw.text}"`);
  }

  console.log(`\n✅ Keywords to ADD (${toAdd.length}):`);
  console.log('─'.repeat(80));
  for (const kw of toAdd) {
    const bid = kw.bidMicros ? `CPC max: RON ${(kw.bidMicros / 1_000_000).toFixed(2)}` : 'bid implicit';
    console.log(`  + "${kw.text}" [${kw.matchType}] — ${bid}`);
    console.log(`    Motiv: ${kw.reason}`);
  }
  console.log('─'.repeat(80));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN — nicio modificare nu a fost aplicată.');
    console.log('   Rulează cu DRY_RUN=false pentru a aplica efectiv.');
    return;
  }

  // Apply changes
  console.log('\n🚀 Aplicare modificări...');
  const mutations = toAdd.map(kw => ({
    _resource: 'AdGroupCriterion' as const,
    resource_name: `customers/${CUSTOMER_ID}/adGroupCriteria/${adGroupId}~-${Math.floor(Math.random() * 999999)}`,
    ad_group: `customers/${CUSTOMER_ID}/adGroups/${adGroupId}`,
    status: enums.AdGroupCriterionStatus.ENABLED,
    keyword: {
      text: kw.text,
      match_type: kw.matchType === 'PHRASE'
        ? enums.KeywordMatchType.PHRASE
        : enums.KeywordMatchType.EXACT,
    },
    ...(kw.bidMicros ? { cpc_bid_micros: kw.bidMicros } : {}),
  }));

  try {
    const result = await customer.mutateResources(mutations);
    console.log(`\n✅ SUCCESS — ${toAdd.length} keywords adăugate!`);
    console.log('Results:', JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error('\n❌ ERROR:', err?.message || err);
    if (err?.errors) console.error('Details:', JSON.stringify(err.errors, null, 2));
  }
}

main().catch(console.error);
