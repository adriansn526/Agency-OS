import { node, para, type ServiceContent } from './types'

/** Pillar page of the hub "Sere și solarii": presents the situations and sends to the guides and price pages. No price table of its own. */
export const sere: ServiceContent = {
  slug: 'sere',
  hub: true,
  seoTitle: 'Sere și solarii: construire, montaj și firme verificate',
  seoDescription: 'Sere și solarii de grădină sau profesionale: ce soluții există, cum alegi structura și acoperirea și cum compari ofertele. Ghiduri și firme verificate.',
  summary: 'Seră de grădină, solar pentru legume sau seră profesională: ce soluții există, cine le montează și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Ce soluții există pentru o seră? | De la solare simple cu folie la sere cu structură rigidă și acoperire din policarbonat sau sticlă. Alegerea depinde de plante, de climă, de buget și de cât de mult vrei să intervii în fiecare sezon.',
    'Cum aleg între folie, policarbonat și sticlă? | Compari lumina, izolarea, rezistența la grindină și vânt și costul de întreținere. O firmă te poate sfătui după ce vede terenul și afli ce vei cultiva.',
    'Am nevoie de autorizație? | Depinde de dimensiune, de tipul construcției și de zonă. Întreabă la primărie înainte de comandă.',
    'Cât costă o seră? | Depinde de suprafață, structură, acoperire, fundație, ventilație și instalații. Compară ofertele pe conținut; paginile de prețuri explică factorii.',
    'Pot monta singur o seră mică? | Un kit mic se poate monta cu atenție, urmând instrucțiunile. Pentru dimensiuni mari, structuri rigide sau instalații, e mai sigur să apelezi la o firmă.',
    'Ce să cer firmei în ofertă? | Structura și materialele precizate, ancorarea, ventilația, ce instalații sunt incluse, termenul și condițiile de plată, toate în scris.',
  ],
  sinonime: ['sere si solarii', 'sere și solarii', 'montaj sera', 'montaj seră', 'firme sere', 'constructii sere'],
  blocks: [
    node('hero', 'hero', { title: 'Sere și solarii', subtitle: 'Construire și montaj pentru grădină sau cultură profesională. Descrie terenul și ce vrei să cultivi și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Ce cultivi și unde' },
      { label: 'Ce alegi', value: 'Structura și acoperirea' },
      { label: 'Compari', value: 'Ce include oferta' },
      { label: 'Autorizare', value: 'Întreabă la primărie' },
    ] }),
    node('intro', 'text', { body: para(
      'Căutările pentru sere sunt adesea despre produse, dar o seră bine făcută depinde de montaj: ancorare, ventilație, scurgerea apei și potrivirea cu plantele. Pagina este despre construirea și montajul serelor ca serviciu, nu despre cumpărarea unui kit.',
      'Găsești mai jos situațiile frecvente și cum alegi o firmă. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Seră și solar: construire și montaj', text: 'Structura, acoperirea, fundația și ventilația, ordinea lucrării și ce compari în ofertă, pentru grădină sau cultură profesională.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Sere și solarii pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('prices', 'price_links', { title: 'Prețuri: sere și solarii' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Descrii nevoia', text: 'Ce cultivi, suprafața dorită, terenul și accesul la apă.' },
      { title: 'Vizită pe teren', text: 'Firma verifică locul, vântul, umbra și scurgerea apei.' },
      { title: 'Ofertă detaliată', text: 'Structură, acoperire, ancorare, ventilație și instalații, cu ce este inclus.' },
      { title: 'Contract și acte', text: 'Contract scris; clarifici la primărie dacă lucrarea cere acte.' },
      { title: 'Montaj și predare', text: 'Montajul, verificările și instrucțiunile de întreținere.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: structura, acoperirea, ancorarea, ventilația și ce instalații includ. Întreabă ce construcții similare a făcut firma și dacă le poți vedea.',
      'Clarifică cine răspunde de eventualele acte și de instalațiile electrice, care se fac de personal autorizat. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: sere și solarii' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
