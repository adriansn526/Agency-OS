import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "foraj-sondaj": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const forajSondaj: ServiceContent = {
  slug: 'foraj-sondaj',
  hub: true,
  seoTitle: 'Foraj și sondaj: situații, acte și firme verificate',
  seoDescription: 'Foraj pentru apă și sondaje geotehnice: ce verifici la autoritatea competentă, cum decurge lucrarea, cum compari ofertele. Ghiduri, prețuri și firme.',
  summary: 'Foraje pentru apă și sondaje de teren: ce acte se verifică, cum decurge lucrarea și cum compari ofertele firmelor specializate.',
  preturi: [],
  intrebari: [
    'Ce diferență este între un foraj de apă și un sondaj geotehnic? | Forajul de apă urmărește captarea unei surse pentru consum; sondajul geotehnic ia probe pentru a afla cum este terenul, în vederea proiectării fundației. Au scopuri, executanți și documente diferite.',
    'Am nevoie de acte pentru un foraj de apă? | Depinde de scop, de zonă și de reglementări. Întreabă la primărie și la autoritatea de gospodărire a apelor înainte de a începe.',
    'Pot avea siguranța că găsesc apă? | Nu. Rezultatul se vede abia în foraj, iar firmele serioase nu garantează dinainte un anumit rezultat.',
    'Pot bea apa dintr-un puț nou? | Doar după analiza unui laborator autorizat; aspectul limpede nu garantează că apa este potrivită.',
    'Când este util un studiu geotehnic? | Atunci când se proiectează fundația unei construcții; proiectantul îți spune ce date îi trebuie, iar primăria ce cere la autorizare.',
    'Cine poate semna un studiu geotehnic? | Un specialist cu atestare pentru domeniu. Cere dovada înainte să contractezi.',
    'De ce depinde costul? | De tipul lucrării, de teren și acces, de analize și de documentele cerute. Cere oferte care spun exact ce include prețul.',
  ],
  sinonime: ['foraje', 'sondaje teren', 'foraj hidrogeologic', 'sondă de foraj', 'lucrări de foraj'],
  blocks: [
    node('hero', 'hero', { title: 'Foraj și sondaj', subtitle: 'Foraj pentru apă sau sondaj de teren: ce întrebi la autoritatea competentă, cum decurge lucrarea și cum compari ofertele. Primești oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Acte', value: 'Se verifică la autoritatea competentă' },
      { label: 'Rezultatul', value: 'Nu se promite dinainte' },
      { label: 'Apa de băut', value: 'Doar după analiză' },
      { label: 'Oferta', value: 'Cum se calculează prețul' },
    ] }),
    node('intro', 'text', { body: para(
      'Forajele se fac pentru două scopuri diferite: apa pentru gospodărie și datele despre teren pentru fundație. În ambele cazuri, rezultatul depinde de subsol, iar un specialist și un contract clar contează mai mult decât promisiunile.',
      'Pagina te ajută să alegi situația potrivită și să ceri oferte comparabile. Racordarea la rețeaua publică de apă are pagina ei, la rețele și branșamente.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Foraj pentru puț de apă', text: 'Cum se alege locul, ce întrebi la autoritatea competentă, cum decurge forajul și de ce apa se analizează înainte de folosire.' },
      { title: 'Studiu geotehnic', text: 'Datele despre teren pe care se sprijină proiectul fundației: sondaje, analize și raport al unui specialist atestat.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Foraj și sondaj pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre foraj și sondaj' }),
    node('prices', 'price_links', { title: 'Prețuri pentru lucrări conexe' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Stabilești scopul', text: 'Apă pentru gospodărie sau date de teren pentru proiect.' },
      { title: 'Verifici actele', text: 'Întrebi autoritățile competente ce se cere pentru lucrarea ta.' },
      { title: 'Ceri oferte', text: 'Pe același conținut, cu modul de calcul al prețului scris.' },
      { title: 'Execuție', text: 'Forajul sau sondajele, cu notarea straturilor întâlnite.' },
      { title: 'Rezultate și predare', text: 'Probe, analize, documente și, la apă, echiparea puțului.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere lucrări similare din zona ta și vorbește cu proprietarii. Întreabă cum documentează firma straturile, ce îți predă la final și ce se întâmplă dacă forajul nu dă rezultatul sperat.',
      'Compară ofertele pe conținut, nu doar pe preț. Pe IntraConstruct vezi firmele verificate și recenziile.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: foraj și sondaj' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte de la firme din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
