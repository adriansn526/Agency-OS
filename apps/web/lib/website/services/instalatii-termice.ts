import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "instalații termice": it presents the situations (heating in the floor, radiators, wood and pellet boilers) and sends to the guides
 * and price pages (blocks that fill themselves with what is published). It has no price table of its own.
 */
export const instalatiiTermice: ServiceContent = {
  slug: 'instalatii-termice',
  hub: true,
  seoTitle: 'Instalații termice: situații, alegere și firme verificate',
  seoDescription: 'Instalații termice pentru casă: încălzire în pardoseală, calorifere, centrale pe lemne sau peleți. Cum alegi, cum compari ofertele și cum găsești firme verificate.',
  summary: 'Încălzire în pardoseală, calorifere și centrale pe combustibil solid: ce soluții există, cum le alegi și cum compari ofertele firmelor de instalații.',
  preturi: [],
  intrebari: [
    'Ce cuprind instalațiile termice ale unei case? | Sursa de căldură (centrală, pompă de căldură, cazan), conductele, corpurile de încălzire (radiatoare sau încălzire în pardoseală) și reglajul. Alegerea unei părți influențează restul, de aceea se planifică împreună.',
    'De unde încep când vreau să schimb încălzirea? | De la sursa de căldură și de la ce vrei să obții: confort, consum, combustibil disponibil. Un instalator care vede casa îți poate spune ce se potrivește, înainte să cumperi aparate.',
    'Care este diferența dintre radiatoare și încălzirea în pardoseală? | Radiatoarele cedează căldura din puncte distincte din cameră, iar încălzirea în pardoseală pe toată suprafața podelei. Se potrivesc surselor și regimurilor diferite; ghidurile din situațiile de mai jos explică alegerea.',
    'Pot să fac singur instalația? | Părți simple, urmând fișa tehnică, uneori da. Partea de gaz, coșul, evacuarea și ventilarea, precum și racordurile electrice se fac de personal autorizat. Pentru restul, o firmă garantează lucrarea.',
    'Cum compar ofertele firmelor? | Pe aceleași criterii: aparate, materiale, lucrări incluse, probă și punere în funcțiune, documente și garanție pentru manoperă. O ofertă mult mai mică omite de regulă ceva important.',
    'De ce depinde costul unei instalații termice? | De sursa de căldură aleasă, de suprafață, de starea instalației existente, de corpurile de încălzire, de reglaj și de accesul la locul de montaj. Paginile de prețuri de mai jos explică factorii, fără sume inventate.',
  ],
  sinonime: ['instalatii termice', 'instalatie termica', 'sisteme de incalzire', 'incalzire casa', 'instalații termice', 'instalație termică', 'sisteme de încălzire', 'încălzire casă'],
  blocks: [
    node('hero', 'hero', { title: 'Instalații termice', subtitle: 'Încălzire în pardoseală, calorifere sau centrală pe combustibil solid: ce soluții există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Sursa de căldură și corpurile' },
      { label: 'Alegi', value: 'Soluția potrivită casei' },
      { label: 'Compari', value: 'Aparate, lucrări, garanție' },
      { label: 'Siguranță', value: 'Gaz, coș și electric: personal autorizat' },
    ] }),
    node('intro', 'text', { body: para(
      'O instalație termică bună înseamnă o sursă de căldură, conducte și corpuri de încălzire potrivite între ele și un reglaj care le face să lucreze împreună. Greșelile de alegere se văd în confort și în consum, iar corecția costă mai mult decât alegerea bună de la început.',
      'Pagina te ajută să identifici situația ta și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Încălzire în pardoseală', text: 'Sistem cu apă sau electric, montat sub finisaj. Contează sursa de căldură, șapa și finisajul ales.' },
      { title: 'Calorifere și radiatoare', text: 'Tipuri, alegere după cameră și sursă, montaj și reglaj prin termostat.' },
      { title: 'Centrală pe lemne sau peleți, cu puffer', text: 'Alegere între combustibili, rolul pufferului, ce pregătești în casă și cine o instalează.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Instalații termice pe situații' }),
    node('prices', 'price_links', { title: 'Prețuri pentru instalații termice' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre instalații termice' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Vizită și evaluare', text: 'Firma vede casa, instalația existentă și nevoile tale și propune soluția.' },
      { title: 'Ofertă detaliată', text: 'Cere aparatele, materialele, lucrările incluse, termenul și garanția. Compară oferte cu același conținut.' },
      { title: 'Contract și avans', text: 'Contract scris cu garanția pentru manoperă. Evită plata integrală în avans.' },
      { title: 'Execuție', text: 'Pregătirea locului, montajul și racordurile; partea de gaz, coș și electric o face personal autorizat.' },
      { title: 'Probă și recepție', text: 'Probă de funcționare, explicații despre folosire și primirea documentelor și a garanției scrise.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: aparate și materiale, lucrările incluse, proba, termenul și garanția. O ofertă mult mai mică omite de obicei un pas important.',
      'Întreabă ce lucrări similare a făcut firma și cine execută părțile care cer autorizare. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre instalații termice' }),
    node('firms', 'firms_list', { title: 'Firme de instalații termice', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie casa și lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
