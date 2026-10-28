import { node, para, type ServiceContent } from './types'

/** Pillar page of the hub "Lucru la înălțime": presents the situations and sends to the guides and price pages. No price table of its own. */
export const lucruLaInaltime: ServiceContent = {
  slug: 'lucru-la-inaltime',
  hub: true,
  seoTitle: 'Lucru la înălțime: situații, siguranță și firme',
  seoDescription: 'Lucru la înălțime și alpinism utilitar: ce lucrări se fac, ce siguranță trebuie să existe și cum compari ofertele echipelor calificate. Firme verificate.',
  summary: 'Lucrări la fațade, geamuri și acoperișuri prin alpinism utilitar sau alte metode: ce siguranță contează și cum compari ofertele echipelor calificate.',
  preturi: [],
  intrebari: [
    'Ce înseamnă lucru la înălțime? | Orice lucrare făcută unde există risc de cădere. Cere echipament și personal calificat și evită improvizațiile cu scări sau cu acces neasigurat.',
    'Ce metode există? | Lucru pe corzi, schelă, platformă elevatoare sau nacelă. Firma o recomandă după clădire, lucrare și siguranță.',
    'Pot face singur lucrarea? | La înălțime, riscurile sunt mari. Pentru fațade, acoperișuri sau etaje superioare, apelează la o echipă calificată.',
    'Ce siguranță trebuie să am în vedere? | Echipă instruită, echipament verificat, ancorări corecte, protecția celor de la sol și un plan clar de intervenție.',
    'Cât costă? | Depinde de înălțime, complexitate, metodă, durată și materiale. Compară ofertele pe conținut; paginile de prețuri explică factorii.',
    'Ce acorduri sunt necesare? | La bloc, asociația și vecinii trebuie informați. Dacă lucrarea afectează domeniul public, întreabă la primărie.',
  ],
  sinonime: ['lucrari la inaltime', 'lucrări la înălțime', 'firme alpinism', 'echipe lucru pe corzi', 'lucrari fatada inalta'],
  blocks: [
    node('hero', 'hero', { title: 'Lucru la înălțime', subtitle: 'Fațade, geamuri și acoperișuri greu accesibile, făcute de echipe calificate. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine lucrează', value: 'Echipe calificate' },
      { label: 'Siguranță', value: 'Echipament verificat, ancorări' },
      { label: 'Metode', value: 'Corzi, schelă sau nacelă' },
      { label: 'Compari', value: 'Metodă, siguranță, ce include' },
    ] }),
    node('intro', 'text', { body: para(
      'Lucrul la înălțime este periculos și nu se improvizează. Pagina nu explică cum se face singur: te ajută să înțelegi ce metode există și cum recunoști o echipă pregătită.',
      'Alegerea metodei (corzi, schelă sau nacelă) depinde de clădire și de lucrare și o recomandă firma după vizită.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Alpinism utilitar: fațade, geamuri, acoperișuri', text: 'Ce lucrări se fac pe corzi, când e potrivit față de schelă și ce siguranță trebuie să existe.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Lucru la înălțime pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('prices', 'price_links', { title: 'Prețuri: lucru la înălțime' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Descrii lucrarea', text: 'Ce trebuie făcut, unde și la ce înălțime aproximativă.' },
      { title: 'Vizită și evaluare', text: 'Firma verifică accesul, ancorările și riscurile.' },
      { title: 'Ofertă detaliată', text: 'Metoda, echipa, materialele și siguranța, în scris.' },
      { title: 'Execuție', text: 'Cu zona de sub lucrare marcată și protejată.' },
      { title: 'Predare', text: 'Verifici rezultatul și primești eventualele documente.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Întreabă ce pregătire și ce asigurări are echipa, ce echipament folosește și cum protejează oamenii și bunurile de jos. Cere lucrări similare și referințe.',
      'Compară ofertele pe aceleași criterii: metoda, lucrarea, materialele și răspunderea. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: lucru la înălțime' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
