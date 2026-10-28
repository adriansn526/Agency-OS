import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "instalații electrice": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const instalatiiElectrice: ServiceContent = {
  slug: 'instalatii-electrice',
  hub: true,
  seoTitle: 'Instalații electrice: situații, ghiduri și electricieni',
  seoDescription: 'Instalații electrice pentru casă și apartament: electrician autorizat, tablou, paratrăsnet și priză de pământ. Ghiduri, prețuri și firme verificate.',
  summary: 'Instalații electrice pentru locuințe și spații comerciale: ce situații există, când ai nevoie de electrician autorizat și cum compari ofertele.',
  sinonime: ['electrician', 'instalații electrice', 'iluminat', 'PRAM', 'verificare instalație electrică', 'defect electric'],
  preturi: [],
  intrebari: [
    'Cine are voie să execute o instalație electrică? | Lucrările la instalațiile electrice se încredințează unui electrician autorizat, cu o autorizare potrivită lucrării. Cere dovada autorizării și verific-o înainte să semnezi; ghidul despre electricianul autorizat explică ce verifici și ce ceri.',
    'Când am nevoie neapărat de electrician autorizat? | La instalații noi sau modificate, la tablou, la circuite noi și la orice legătură cu rețeaua operatorului. Nu face singur astfel de lucrări: o greșeală poate provoca electrocutare sau incendiu și poate crea probleme la recepție sau cu asigurarea locuinței.',
    'Ce este PRAM și de ce îl cer? | Este verificarea prizei de pământare și a izolației, cu măsurători consemnate într-un buletin. Cere buletinul și schema tabloului ca parte din predarea lucrării, ca să poți dovedi ulterior starea instalației. Detalii despre priza de pământ găsești în ghidul dedicat.',
    'Cum compar ofertele pentru o instalație electrică? | Cere un deviz pe puncte de consum, cu materialele specificate (tipul cablului, aparatajul, circuitele din tablou) și compară ofertele pe același conținut, nu doar după total. Paginile de prețuri de mai jos explică de ce depinde costul.',
    'Cât costă o instalație electrică sau un tablou nou? | Depinde de numărul de puncte de consum și de circuite, de starea instalației existente, de materialele alese și de modul de montaj. Paginile de prețuri de mai jos explică factorii, iar oferta concretă o primești după vizită.',
    'Când trebuie să schimb tabloul electric? | Dacă siguranțele sar des, tabloul se încălzește sau are aparate vechi, cere o verificare. Decizia și lucrarea revin unui electrician autorizat; ghidul despre tablou explică ce conține și ce compari în oferte.',
    'Cum procedez la un defect (scurtcircuit, lipsă curent, miros de ars)? | Dacă este posibil în siguranță, oprești alimentarea de la întrerupătorul general și nu mai folosești circuitul respectiv. Nu deschide tabloul și nu repara singur: cheamă un electrician autorizat pentru diagnoză.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Instalații electrice', subtitle: 'Instalații noi, tablouri, protecție la trăsnet și verificări, executate de electricieni autorizați. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații', 'Firme verificate'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine lucrează', value: 'Electrician autorizat' },
      { label: 'Primul pas', value: 'Lista consumatorilor' },
      { label: 'Compari', value: 'Deviz pe puncte de consum' },
      { label: 'La predare', value: 'Buletin PRAM și schema tabloului' },
    ] }),
    node('intro', 'text', { body: para(
      'O instalație electrică corectă nu se vede, dar de ea depind siguranța și confortul întregii locuințe. Lipsa protecției diferențiale, un tablou depășit sau o pământare defectă sunt probleme care duc la incendii și accidente și apar de obicei la lucrările făcute fără autorizare.',
      'Pagina aceasta te ajută să identifici situația și te trimite la ghidul potrivit. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Electrician autorizat', text: 'Lucrările la instalațiile electrice se încredințează unui electrician autorizat; ghidul explică ce verifici și ce ceri înainte de lucrare.' },
      { title: 'Tablou electric', text: 'Montajul sau înlocuirea tabloului o face un electrician autorizat; ghidul arată ce conține tabloul și ce compari în oferte.' },
      { title: 'Paratrăsnet și priză de pământ', text: 'Protecția la trăsnet și împământarea se proiectează și se execută de specialiști; ghidul explică ce lucrări implică.' },
      { title: 'Instalație electrică la casă și apartament', text: 'Circuite, tablou, aparataj și legătura cu rețeaua: ghidul arată ce include o instalație nouă și cum compari ofertele.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Instalații electrice pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre instalații electrice' }),
    node('prices', 'price_links', { title: 'Prețuri pentru instalații electrice' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Lista consumatorilor', text: 'Descrii ce vrei să alimentezi, inclusiv aparatele mari (aragaz, cuptor, boiler, aer condiționat), care se discută cu electricianul.' },
      { title: 'Vizită și ofertă', text: 'Electricianul vede locul și propune circuitele și tabloul. Oferta enumeră punctele de consum, materialele și aparatajul.' },
      { title: 'Contract', text: 'Contract scris, cu autorizarea electricianului, termenul și garanția pentru lucrare.' },
      { title: 'Execuție', text: 'Trasee, cabluri, tablou și apoi aparataj și iluminat, pe etapele convenite cu firma.' },
      { title: 'Verificări și predare', text: 'Se testează protecțiile și se măsoară pământarea și izolația; primești buletinul și schema tabloului.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi electricianul', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere întâi dovada autorizării și verific-o: ea trebuie să corespundă lucrării. Un electrician serios nu ezită să o arate și poate emite factură și garanție pentru lucrare.',
      'Cere un deviz pe puncte de consum și cu materialele specificate. Compară ofertele pe aceleași criterii, nu doar după preț. Include verificările și schema tabloului în contract.',
      'Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre instalații electrice' }),
    node('firms', 'firms_list', { title: 'Firme de instalații electrice', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
