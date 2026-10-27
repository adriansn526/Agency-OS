import { getAuthHeader } from '../lib/integrations/dataforseo'

async function queryDfs(endpoint: string, postData: any) {
  const token = process.env.DATAFORSEO_AUTH_TOKEN
  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(postData)
  })
  if (!res.ok) {
    throw new Error(`DataForSEO error: ${res.status} ${res.statusText}`)
  }
  return await res.json()
}

async function main() {
  console.log('=== 1. Căutare pentru Ghilotina Sticlă & Sisteme Retractabile ===')
  const resGhilotina = await queryDfs('dataforseo_labs/google/historical_search_volume/live', [{
    location_code: 2642,
    language_code: 'ro',
    keywords: [
      'geamuri ghilotina',
      'sticla ghilotina',
      'ghilotina sticla',
      'pereti sticla terasa',
      'perete sticla terasa',
      'sistem sticla ghilotina',
      'sticla glisanta',
      'inchidere balcon sticla securizata',
      'balustrada sticla terasa',
      'inchideri balcoane'
    ]
  }])

  const itemsGhilotina = resGhilotina.tasks?.[0]?.result?.[0]?.items || []
  console.log('Rezultate Ghilotină & Sticlă:')
  for (const item of itemsGhilotina) {
    const kw = item.keyword
    const vol = item.keyword_info?.search_volume || 0
    const cpc = item.keyword_info?.cpc || 0
    const comp = item.keyword_info?.competition || 0
    console.log(`- ${kw}: Vol=${vol}, CPC=$${cpc}, Comp=${comp}`)
  }

  console.log('\n=== 2. Cuvinte cheie conexe (Related Keywords) pentru fiecare nișă ===')
  const seeds = [
    'inchidere terasa sticla',
    'inchidere balcon',
    'pergola bioclimatica',
    'sticla glisanta',
    'folie terasa'
  ]

  for (const seed of seeds) {
    const resRel = await queryDfs('dataforseo_labs/google/related_keywords/live', [{
      location_code: 2642,
      language_code: 'ro',
      keyword: seed,
      limit: 10,
      order_by: ['keyword_data.keyword_info.search_volume,desc']
    }])

    const relItems = resRel.tasks?.[0]?.result?.[0]?.items || []
    console.log(`\nTop căutări conexe pentru [${seed}]:`)
    for (const r of relItems.slice(0, 8)) {
      const kw = r.keyword_data?.keyword
      const vol = r.keyword_data?.keyword_info?.search_volume || 0
      const cpc = r.keyword_data?.keyword_info?.cpc || 0
      console.log(`  * ${kw}: Vol ${vol}/lună | CPC: $${cpc}`)
    }
  }

  console.log('\n=== 3. Analiză Competitori pe piața din România (inchideriterase.ro) ===')
  const resComp = await queryDfs('dataforseo_labs/google/ranked_keywords/live', [{
    target: 'inchideriterase.ro',
    location_code: 2642,
    language_code: 'ro',
    limit: 15,
    order_by: ['keyword_data.keyword_info.search_volume,desc']
  }])

  const rankedItems = resComp.tasks?.[0]?.result?.[0]?.items || []
  console.log('Top cuvinte cheie pe care rankează deja inchideriterase.ro:')
  for (const r of rankedItems) {
    const kw = r.keyword_data?.keyword
    const pos = r.ranked_serp_element?.serp_item?.rank_group
    const vol = r.keyword_data?.keyword_info?.search_volume || 0
    console.log(`  * ${kw} (Poz: ${pos}): Vol ${vol}/lună`)
  }
}

main().catch(console.error)
