import { node, para, type ServiceContent } from './types'

/** Pillar page of the hub "Lifturi și ascensoare": presents the situations and sends to the guides and price pages. No price table of its own. */
export const lifturi: ServiceContent = {
  slug: 'lifturi',
  hub: true,
  seoTitle: 'Lifturi și ascensoare: situații, soluții și firme',
  seoDescription: 'Lifturi pentru casă, ascensoare de bloc și platforme pentru dizabilități: soluții, siguranță, avize și cum compari ofertele. Ghiduri și firme verificate.',
  summary: 'Lift de casă, ascensor de bloc sau platformă pentru dizabilități: ce soluții există, ce reguli contează și cum compari ofertele firmelor autorizate.',
  preturi: [],
  intrebari: [
    'Cine poate monta un lift? | Doar personal și firme autorizate pentru acest domeniu. Nu este o lucrare pentru montaj pe cont propriu.',
    'Ce verificări există după montaj? | Liftul este supus verificărilor la punerea în funcțiune și periodic, făcute de personal autorizat. Detaliile depind de reglementări; întreabă firma și autoritatea competentă.',
    'Am nevoie de acordul vecinilor? | La bloc, decizia aparține proprietarilor, prin asociație. Întreabă la asociație și la primărie ce hotărâri și acte sunt necesare.',
    'Se poate monta un lift într-o clădire existentă? | De obicei da, dar depinde de structură și spațiu. O firmă de specialitate evaluează clădirea înainte de ofertă.',
    'Cât costă un lift? | Depinde de tip, niveluri, lucrări pregătitoare, finisaje și service. Compară ofertele pe conținut; paginile de prețuri explică factorii.',
    'De ce contează service-ul? | Un lift neîntreținut devine nesigur. Cere contract de service cu intervenții și răspundere clare, încă dinainte de montaj.',
  ],
  sinonime: ['lifturi si ascensoare', 'lifturi și ascensoare', 'montaj lift', 'service lift', 'firme lifturi', 'modernizare lift'],
  blocks: [
    node('hero', 'hero', { title: 'Lifturi și ascensoare', subtitle: 'Pentru casă, bloc sau acces cu dizabilități. Montajul îl face doar personal autorizat; descrie nevoia și primești oferte de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Nevoia și spațiul' },
      { label: 'Cine montează', value: 'Doar personal autorizat' },
      { label: 'Autorizare și acord', value: 'Primărie și asociație' },
      { label: 'După montaj', value: 'Service și verificări' },
    ] }),
    node('intro', 'text', { body: para(
      'Liftul este o instalație cu risc: montajul, punerea în funcțiune, verificările și service-ul se fac de personal și firme autorizate. Pagina te ajută să înțelegi situațiile frecvente și ce să întrebi, fără a înlocui avizul autorităților sau al specialiștilor.',
      'Detaliile de autorizare și acordurile (la bloc, ale asociației) depind de fiecare caz: întreabă la primărie, la asociație și la firma autorizată.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Lift pentru casă, interior sau exterior', text: 'Variante, evaluarea clădirii, ce implică montajul și ce întrebi firmei.' },
      { title: 'Lift de bloc și pentru persoane cu dizabilități', text: 'Cine decide, ce verificări contează și ce soluții de accesibilitate există.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Lifturi și ascensoare pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('prices', 'price_links', { title: 'Prețuri: lifturi și ascensoare' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Descrii nevoia', text: 'Cine folosește liftul, câte niveluri și ce spațiu este disponibil.' },
      { title: 'Evaluare la fața locului', text: 'Firma verifică structura, accesul și variantele posibile.' },
      { title: 'Ofertă și acte', text: 'Oferta detaliată; clarifici ce acte și acorduri sunt necesare.' },
      { title: 'Montaj', text: 'Executat de personal autorizat, cu lucrări pregătitoare de specialitate.' },
      { title: 'Punere în funcțiune și service', text: 'Probe, verificări, documente și contract de întreținere.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere dovada autorizării pentru montaj și service, lucrări similare și referințe. Compară ofertele pe aceleași criterii: tipul liftului, lucrările pregătitoare, montajul și service-ul.',
      'La bloc, prezintă ofertele asociației cu toate detaliile. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: lifturi și ascensoare' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
