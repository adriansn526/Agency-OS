import { getKeywordMetrics, getRelatedKeywords } from '../lib/integrations/dataforseo'

const KEYWORDS_BY_PAGE = {
  'inchideri-terase-sticla': [
    'inchidere terasa cu sticla',
    'inchideri terase sticla',
    'geamuri glisante terasa',
    'sticla glisanta terasa',
    'sistem glisant sticla terasa',
    'cortina de sticla',
    'inchidere terasa sticla securizata',
    'inchidere terasa sticla pret'
  ],
  'inchideri-balcoane-sticla': [
    'inchidere balcon cu sticla',
    'inchidere balcon sticla',
    'geamuri glisante balcon',
    'inchidere balcon fara rama',
    'balcon sticla securizata',
    'inchidere balcon sticla pret'
  ],
  'sticla-ghilotina': [
    'sticla ghilotina',
    'geamuri ghilotina',
    'sticla ghilotina terasa',
    'pereti sticla retractabili',
    'sistem ghilotina sticla',
    'sticla ghilotina pret'
  ],
  'pergole-bioclimatice': [
    'pergola bioclimatica',
    'pergole bioclimatice',
    'pergola retractabila',
    'pergola aluminiu',
    'pergola bioclimatica pret',
    'pergole terase'
  ],
  'inchideri-terase-folie': [
    'inchidere terasa cu folie',
    'prelata transparenta terasa',
    'folie terasa capse si bride',
    'rulouri transparente terasa',
    'inchidere terasa folie pret',
    'rulouri casetate terasa'
  ]
}

async function run() {
  console.log('--- Interogare DataForSEO pentru cele 5 pagini ---')
  for (const [slug, keywords] of Object.entries(KEYWORDS_BY_PAGE)) {
    console.log(`\n================== Pagină: ${slug} ==================`)
    const metrics = await getKeywordMetrics(keywords, 2642, 'ro')
    console.log(JSON.stringify(metrics, null, 2))
  }
}

run().catch(console.error)
