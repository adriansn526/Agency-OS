import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "șeminee, sobe și coșuri de fum": it presents the situations and sends to the guides and price pages (blocks that fill
 * themselves with what is published). No price table of its own: prices live in the dedicated price pages.
 */
export const sobeSemineuri: ServiceContent = {
  slug: 'sobe-semineuri',
  hub: true,
  seoTitle: 'Șeminee, sobe și coșuri de fum: situații și firme',
  seoDescription: 'Șemineu, sobă din teracotă, sobă pe lemne sau peleți și coș de fum: ce soluții există, cine le montează, ce cere siguranța și cum compari ofertele.',
  summary: 'Șemineu, sobă din teracotă, sobă pe lemne sau peleți: ce soluții există, ce cere coșul de fum și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Ce lucrări acoperă această categorie? | Montajul și zidirea de șeminee și sobe, inclusiv legătura cu coșul de fum. Nu vindem și nu recomandăm produse; ne ocupăm de cine execută lucrarea, cum alegi și ce întrebi.',
    'De ce este coșul de fum atât de important? | Evacuează fumul și gazele de ardere și întreține tirajul. Un coș nepotrivit sau neverificat poate duce la fum în casă, depuneri sau monoxid de carbon. Verificarea lui, tirajul și evacuarea gazelor le face personal autorizat.',
    'Pot monta singur o sobă sau un șemineu? | Părți mici, cum ar fi finisajele decorative, pot fi simple, dar racordarea la coș, tirajul și distanțele față de materialele combustibile țin de siguranță și se lasă pe seama specialiștilor. Nu urma tutoriale pentru aceste părți.',
    'Ce diferență este între șemineu, sobă din teracotă și sobă metalică? | Șemineul are în general un rol decorativ sau mixt; soba din teracotă se zidește pe loc și păstrează căldura mult timp; soba metalică, pe lemne sau pe peleți, este un aparat gata făcut, montat de o firmă. Pagina fiecărei situații le detaliază.',
    'Am nevoie de aprobări pentru o sobă sau un șemineu? | Depinde de casă, de dacă modifici coșul sau structura și de regulile locale. În bloc, sau la clădiri speciale, pot exista restricții. Întreabă la primărie sau la asociație înainte de începere.',
    'Cum compar ofertele? | Pe conținut: aparatul sau tipul de sobă, soluția pentru coș, protecțiile pentru pardoseală și pereți, finisajele și garanția. O ofertă care nu menționează coșul este de obicei incompletă.',
    'Ce garanție ar trebui să primesc? | Garanția pentru manoperă, în scris, și documentele aparatului. Cere și informații despre cum se întreține coșul și cine face verificările periodice.',
  ],
  sinonime: ['sobe', 'seminee', 'șeminee', 'sobe si seminee', 'sobe și șeminee', 'incalzire cu lemne', 'încălzire cu lemne'],
  blocks: [
    node('hero', 'hero', { title: 'Șeminee, sobe și coșuri de fum', subtitle: 'Șemineu, sobă din teracotă, sobă pe lemne sau peleți: ce soluții există, ce cere siguranța și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Clarifici coșul de fum' },
      { label: 'Siguranță', value: 'Verificări de personal autorizat' },
      { label: 'Compari', value: 'Aparat, coș, manoperă' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'Un șemineu sau o sobă schimbă felul în care se încălzește și arată o casă, dar sunt și instalații cu foc, deci siguranța vine înaintea esteticii. Cea mai importantă parte este adesea cea pe care nu o vezi: coșul de fum, tirajul și distanțele față de materialele din jur.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Șemineu pe lemne', text: 'Deschis, cu insert sau termoșemineu: montaj, coș de fum și ce rămâne în sarcina personalului autorizat.' },
      { title: 'Sobă din teracotă', text: 'Sobă zidită, cu acumulare de căldură: cum funcționează, cine o zidește și ce verifici înainte.' },
      { title: 'Sobă pe lemne sau pe peleți', text: 'Diferențele dintre cele două tipuri, cerințele de coș și ce întrebi o firmă de montaj.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Șeminee și sobe pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre șeminee și sobe' }),
    node('prices', 'price_links', { title: 'Prețuri pentru sobe, șeminee și coșuri' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Alegerea tipului', text: 'Stabilești dacă vrei decor, încălzire sau ambele, și ce combustibil ai la îndemână.' },
      { title: 'Verificarea coșului', text: 'Personalul autorizat verifică un coș existent sau propune soluția pentru unul nou.' },
      { title: 'Ofertă detaliată', text: 'Cere aparatul sau modelul de sobă, soluția de coș, protecțiile, finisajele, termenul și garanția.' },
      { title: 'Execuție', text: 'Pregătirea locului, montajul sau zidirea, racordarea la coș și finisajele.' },
      { title: 'Prima aprindere și instruire', text: 'Se verifică tirajul și funcționarea, iar firma explică folosirea și întreținerea.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: aparatul sau soba, coșul, protecțiile, finisajele, termenul și garanția. Întreabă cine verifică coșul și ce calificare are.',
      'Cere lucrări similare pe care le poți vedea. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre șeminee, sobe și coșuri' }),
    node('firms', 'firms_list', { title: 'Firme pentru șeminee și sobe', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte pentru lucrarea ta?', text: 'Descrie casa și ce soluție ai în vedere și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
