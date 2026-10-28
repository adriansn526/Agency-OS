import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "fotovoltaice și energie regenerabilă": it presents the situations and sends to the guide and price pages (blocks that fill
 * themselves with what is published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const fotovoltaiceEnergieRegenerabila: ServiceContent = {
  slug: 'fotovoltaice-energie-regenerabila',
  hub: true,
  seoTitle: 'Fotovoltaice și energie regenerabilă: firme verificate',
  seoDescription: 'Sisteme fotovoltaice, panouri solare pentru apă caldă, baterii și invertor: cine le montează, cum compari ofertele și ce întrebi firma. Firme verificate.',
  summary: 'Fotovoltaice și energie solară pentru casă: ce lucrări există, cine le face, cum compari ofertele și ce verifici înainte de montaj.',
  preturi: [],
  intrebari: [
    'Ce lucrări intră la energie regenerabilă pentru casă? | În această categorie găsești sistemele fotovoltaice (curent electric), panourile solare termice (apă caldă) și componentele asociate, ca invertorul și bateria. Fiecare are pagina ei, cu ce trebuie să știi înainte de ofertă.',
    'Cine face aceste lucrări? | Firme specializate, cu personal care lucrează la înălțime pe acoperiș și cu electricieni sau instalatori autorizați pentru partea de curent și de apă. Racordarea la rețeaua electrică are o procedură proprie, cu operatorul de distribuție.',
    'Cum aleg între un sistem fotovoltaic și panouri solare pentru apă caldă? | Depinde de nevoia ta: curent electric sau apă caldă. Cele două sisteme funcționează diferit și se montează de meserii diferite. Descrie nevoia unei firme și cere să-ți explice de ce propune o soluție sau alta.',
    'De ce depinde costul unei astfel de lucrări? | De mărimea sistemului, de calitatea componentelor, de tipul acoperișului, de accesul pentru montaj, de lucrările la tabloul electric sau la instalația de apă și de actele necesare. Paginile de preț de mai jos explică factorii.',
    'Pot primi sprijin financiar pentru lucrare? | Programele de sprijin se schimbă, au condiții proprii și nu pot fi promise de o firmă. Verifică în prezent pe site-urile instituțiilor care le administrează și cere firmei să explice în scris ce se aplică în cazul tău.',
    'Ce este un prosumator? | Este un consumator care produce și energie electrică pentru nevoile proprii. Regulile pentru conectare se stabilesc cu operatorul de distribuție; ghidul din această categorie explică etapele generale, fără să înlocuiască regulile în vigoare.',
    'Pot monta singur? | Lucrul la acoperiș și partea electrică cer personal calificat și autorizat. Pentru siguranță și pentru garanția produselor, lasă montajul unei firme.',
  ],
  sinonime: ['energie regenerabilă', 'energie solară', 'energie verde', 'surse regenerabile', 'instalații solare', 'energie solară pentru casă', 'energie regenerabila', 'energie solara', 'instalatii solare'],
  blocks: [
    node('hero', 'hero', { title: 'Fotovoltaice și energie regenerabilă', subtitle: 'Curent sau apă caldă din soare: ce lucrări există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Ce nevoie ai: curent sau apă caldă' },
      { label: 'Cine montează', value: 'Personal autorizat' },
      { label: 'Compari', value: 'Componente, montaj și acte' },
      { label: 'Reguli', value: 'Se verifică la operator și autorități' },
    ] }),
    node('intro', 'text', { body: para(
      'Soarele poate produce curent electric, prin sisteme fotovoltaice, sau apă caldă, prin panouri solare termice. Sunt lucrări diferite, cu componente, meserii și acte diferite, iar alegerea corectă începe de la ce nevoie ai.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Panouri fotovoltaice pentru casă', text: 'Cine montează, ce intră în ofertă și cum compari firmele. Include diferența dintre sistemele conectate la rețea și cele izolate.' },
      { title: 'Panouri solare pentru apă caldă', text: 'Sisteme presurizate și nepresurizate, boiler și instalatori. Nu produc curent, ci încălzesc apa menajeră.' },
      { title: 'Baterii de stocare și invertor', text: 'Rolul fiecărei componente, compatibilitatea dintre ele și când are sens o baterie.' },
      { title: 'Prosumator: cum funcționează', text: 'Ghid informativ despre etapele generale și cine face ce. Regulile concrete se verifică la operator și autorități.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Fotovoltaice pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre fotovoltaice' }),
    node('prices', 'price_links', { title: 'Prețuri pentru fotovoltaice' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Stabilirea nevoii', text: 'Curent sau apă caldă, cât consumi și ce acoperiș ai. Firma ar trebui să pornească de la datele tale.' },
      { title: 'Vizită și ofertă detaliată', text: 'Cere modelele componentelor, montajul, proiectul, actele și garanțiile, separat. Compară oferte cu același conținut.' },
      { title: 'Contract și acte', text: 'Contract scris, cu etape și garanții. Pentru sistemele conectate la rețea, firma explică pașii cu operatorul.' },
      { title: 'Montaj', text: 'Lucrul la acoperiș și partea electrică le fac doar echipe calificate și autorizate.' },
      { title: 'Punere în funcțiune și recepție', text: 'Probe, predarea documentelor și a instrucțiunilor și, la sistemele cu rețea, pașii finali cu operatorul.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: componentele cu modelele exacte, montajul, actele, termenul și garanțiile. Fii atent la promisiuni de economii sau de recuperare a investiției făcute fără să fi văzut locul și consumul tău.',
      'Întreabă ce lucrări similare a făcut firma, cine răspunde pentru partea electrică și cine se ocupă de documentele către operator. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre fotovoltaice și energie regenerabilă' }),
    node('firms', 'firms_list', { title: 'Firme de fotovoltaice și energie regenerabilă', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai o lucrare de energie regenerabilă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
