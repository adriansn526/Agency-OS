import { node, para, type ServiceContent } from './types'

/** Pillar page of the hub "Închirieri utilaje și schele": presents the situations and sends to the guides and price pages. No price table of its own. */
export const inchirieriUtilajeSchele: ServiceContent = {
  slug: 'inchirieri-utilaje-schele',
  hub: true,
  seoTitle: 'Închirieri utilaje și schele: situații și firme',
  seoDescription: 'Închirieri de utilaje de construcții și schele: ce se oferă, cu sau fără operator, siguranță, contract și cum compari ofertele. Firme verificate.',
  summary: 'Schelă, popi, buldoexcavator, miniexcavator sau macara: ce se poate închiria, ce siguranță și ce asigurări contează și cum compari ofertele.',
  preturi: [],
  intrebari: [
    'Ce pot închiria? | Schele și popi pentru lucru la înălțime și turnări, utilaje precum buldoexcavatoare, miniexcavatoare sau macarale, de obicei cu operator.',
    'Cu sau fără operator? | Utilajele de construcții se conduc de personal calificat și autorizat; de regulă se închiriază cu operator. Întreabă firma ce condiții aplică.',
    'Ce asigurări sunt importante? | Cele pentru utilaj, operator și daune produse terților. Cere firmei să-ți explice ce acoperă și cine răspunde.',
    'Am nevoie de autorizație? | Dacă lucrarea ocupă domeniul public sau implică ridicări și săpături speciale, probabil da. Depinde de primărie și de situație; întreabă înainte de începere.',
    'Cât costă o închiriere? | Depinde de tip, durată, transport, operator și condiții. Compară ofertele pe conținut; paginile de prețuri explică factorii.',
    'La ce fac atenție în contract? | Durata, plata, garanția, răspunderea pentru pierderi și deteriorări și cine montează, transportă și returnează.',
  ],
  sinonime: ['inchirieri echipamente constructii', 'închirieri echipamente construcții', 'firme inchirieri utilaje', 'închirieri schele și utilaje'],
  blocks: [
    node('hero', 'hero', { title: 'Închirieri utilaje și schele', subtitle: 'Schelă, popi sau utilaje cu operator, pentru lucrarea ta. Descrie ce ai nevoie și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Se închiriază', value: 'Schele, popi, utilaje' },
      { label: 'Operator', value: 'Calificat, cu asigurări' },
      { label: 'Contract', value: 'Durată, răspundere, plată' },
      { label: 'Domeniu public', value: 'Întreabă la primărie' },
    ] }),
    node('intro', 'text', { body: para(
      'Schela, popii și utilajele de construcții se închiriază de obicei, nu se cumpără. Diferența dintre o ofertă bună și una slabă ține de starea materialului, de operator, de asigurări și de condițiile din contract.',
      'Pagina te ajută să alegi între situațiile frecvente și să știi ce să întrebi. Lucrările pe domeniul public sau cu ridicări grele pot cere aprobări: întreabă la primărie.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Închiriere schelă metalică și popi', text: 'Cu sau fără montaj, siguranță, contract și ce intră în ofertă.' },
      { title: 'Închiriere buldoexcavator, miniexcavator și macara', text: 'Utilaje cu operator calificat, asigurări, acces pe teren și contract.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Închirieri utilaje și schele pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('prices', 'price_links', { title: 'Prețuri: închirieri utilaje și schele' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Descrii lucrarea', text: 'Tipul, volumul, terenul, accesul și durata estimată.' },
      { title: 'Cere oferte', text: 'Compară pe aceleași criterii: material sau utilaj, operator, transport.' },
      { title: 'Contract scris', text: 'Cu durată, plată, răspundere pentru daune și garanție.' },
      { title: 'Livrare și lucrare', text: 'Verifici starea și urmărești respectarea condițiilor de siguranță.' },
      { title: 'Returnare', text: 'Predare conform contractului, cu dovada returnării.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: ce se închiriază, dacă include operator, transport și montaj, ce asigurări există și ce garanție se cere. Întreabă în ce stare este materialul sau utilajul.',
      'Cere contract clar și lucrări similare. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: închirieri utilaje și schele' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
