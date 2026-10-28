import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "ipsoserie și gips-carton": it presents the situations and sends to the price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const ipsoserieGipsCarton: ServiceContent = {
  slug: 'ipsoserie-gips-carton',
  hub: true,
  seoTitle: 'Ipsoserie și gips-carton: lucrări, soluții și firme',
  seoDescription: 'Ipsoserie și gips-carton: tavane, pereți despărțitori și tencuieli. Cum alegi sistemul, cum compari ofertele și firme verificate din zona ta.',
  summary: 'Tavane false, pereți despărțitori și tencuieli: ce lucrări de ipsoserie și gips-carton există, cum le alegi și cum compari ofertele.',
  preturi: [],
  intrebari: [
    'Ce înseamnă ipsoserie și gips-carton? | Lucrări de finisaj și compartimentare: sisteme uscate din plăci de gips-carton pe structură metalică (tavane, pereți, placări) și lucrări cu mortar aplicat pe pereți, adică tencuielile.',
    'Care este diferența dintre un sistem uscat și tencuială? | Sistemul din gips-carton se montează fără lucrări umede, pe o structură, și se finisează la rosturi. Tencuiala este un mortar aplicat direct pe zidărie. Fiecare se potrivește altor situații.',
    'Cum aleg sistemul potrivit? | Pornește de la scop: despărțire, ascundere de instalații, izolare fonică sau termică, corectarea unui perete. Spune montatorului ce ai nevoie, iar el propune tipul de plăci și structura.',
    'Ce ar trebui să conțină o ofertă? | Suprafața măsurată, sistemul sau mortarul folosit, etapele incluse (structură, plăci, rosturi, glet), cine asigură materialele, termenul, garanția și condițiile de plată.',
    'Cum compar ofertele? | Pe același conținut: același tip de plăci sau mortar, același nivel de finisaj și aceleași suprafețe. Diferențele mari vin, de obicei, din finisaj sau din sistemul mai simplu propus.',
    'Pot face lucrarea singur? | La lucrări mici și simple, uneori. Tavanele cu forme, pereții cu cerințe fonice sau antifoc și tencuielile pe suprafețe mari cer experiență și, la tencuieli, uneori utilaj.',
  ],
  sinonime: ['ipsoserie', 'ipsosar', 'gips-carton', 'gips carton', 'lucrări de ipsos', 'compartimentări', 'finisaje interioare'],
  blocks: [
    node('hero', 'hero', { title: 'Ipsoserie și gips-carton', subtitle: 'Tavane, pereți despărțitori și tencuieli: ce lucrări există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Scopul lucrării' },
      { label: 'Ce alegi', value: 'Sistem uscat sau tencuială' },
      { label: 'Compari', value: 'Sistem, finisaj, suprafață' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'Ipsoseria și gips-cartonul stau în spatele pereților drepți, al tavanelor curate și al compartimentărilor rapide. Alegerea între un sistem uscat și o tencuială depinde de ce vrei să obții: despărțire, ascundere de instalații, izolare fonică sau doar îndreptarea pereților.',
      'Pagina te ajută să identifici lucrarea de care ai nevoie și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Tavan fals din rigips', text: 'Structură suspendată, plăci, ușă de vizitare și instalații ascunse; ce verifici înainte ca tavanul să se închidă.' },
      { title: 'Pereți despărțitori și placări', text: 'Tipuri de plăci pentru spații uscate, umede, fonice sau antifoc; ce întrebi montatorul și ce compari în oferte.' },
      { title: 'Tencuială mecanizată sau manuală', text: 'Interior și exterior, tipuri de mortar și criterii de alegere între cele două metode de aplicare.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Ipsoserie și gips-carton pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('prices', 'price_links', { title: 'Prețuri pentru ipsoserie și gips-carton' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Vizită și măsurători', text: 'Firma vede locul, discută scopul lucrării și măsoară. Oferta trebuie să pornească de aici.' },
      { title: 'Ofertă detaliată', text: 'Cere sistemul sau mortarul exact, etapele incluse, finisajul, termenul și garanția. Compară oferte cu același conținut.' },
      { title: 'Contract și avans', text: 'Contract scris, cu suprafețe, materiale și termen. Evită plata integrală în avans.' },
      { title: 'Execuție', text: 'Trasare, structură sau pregătirea zidăriei, plăci sau mortar, rosturi și finisaj, cu verificări între etape.' },
      { title: 'Recepție', text: 'Verifică planeitatea și rosturile în lumină rasantă, cere retușurile și primește garanția scrisă.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: sistemul, finisajul inclus, termenul și garanția. O ofertă mult mai mică propune, de obicei, un sistem mai simplu sau omite finisajul.',
      'Întreabă ce lucrări similare a făcut firma și cere, dacă se poate, referințe. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre ipsoserie și gips-carton' }),
    node('firms', 'firms_list', { title: 'Firme de ipsoserie și gips-carton', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte de la firme din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
