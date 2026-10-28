import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "case modulare": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const caseModulare: ServiceContent = {
  slug: 'case-modulare',
  hub: true,
  seoTitle: 'Case modulare: situații, soluții și firme verificate',
  seoDescription: 'Case modulare, containere de locuit și case pe structură ușoară: ce soluții există, ce acte și lucrări de teren contează și cum compari ofertele firmelor.',
  summary: 'Case modulare, containere de locuit și case pe structură metalică sau din lemn: ce soluții există, ce acte trebuie lămurite și cum compari ofertele.',
  preturi: [],
  intrebari: [
    'Ce este o casă modulară? | O locuință construită din module prefabricate într-un atelier sau o fabrică, aduse apoi pe teren și asamblate. Cât din casă este gata înainte de livrare diferă mult de la un producător la altul, de aceea cere întotdeauna lista a ceea ce include oferta.',
    'Ce tipuri de construcții ușoare există? | Containere de locuit, case modulare din mai multe module și case pe schelet metalic sau din lemn. Fiecare are structură, izolație și limite diferite; paginile de situații de mai jos explică pe rând fiecare variantă.',
    'Am nevoie de autorizație pentru o casă modulară sau un container? | Depinde de teren, de localitate, de folosință și de regulile urbanistice. Nu există un răspuns valabil peste tot: întreabă la primărie înainte de comandă și cere în scris ce documente se cer.',
    'Ce lucrări se fac pe teren, în afara casei? | Fundația sau reazemul, drumul de acces, racordurile la apă, curent și canalizare. Acestea cer proiect și execuție separate de module și se coordonează cu livrarea, de aceea întreabă ce include și ce nu include oferta.',
    'Este o casă modulară mai ieftină sau mai rapidă? | Nu prin definiție. Producția în atelier poate muta o parte din lucru, dar adaugă transportul, ridicarea și lucrările de teren. Prețul și termenul se stabilesc pe baza unei oferte detaliate, nu din reclame.',
    'De ce depinde costul unei case modulare? | De suprafață, de structură și izolație, de finisaje și instalații, de transport și montaj, de lucrările de teren și de acte. Paginile de prețuri de mai jos explică factorii și te ajută să compari ofertele.',
    'Cum aleg o firmă pentru o casă modulară? | Alege o firmă care răspunde clar la întrebările despre acte, teren și garanție, lucrează cu proiect și specialiști autorizați și încheie contract cu specificații, etape și plăți legate de execuție. Verifică lucrări deja livrate.',
  ],
  sinonime: ['case prefabricate', 'casă prefabricată', 'construcții modulare', 'construcții ușoare', 'locuințe modulare', 'casă ușoară'],
  blocks: [
    node('hero', 'hero', { title: 'Case modulare', subtitle: 'Containere de locuit, case modulare și case pe structură ușoară: ce soluții există, ce acte și lucrări contează și cum compari ofertele. Descrie proiectul și primești oferte de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Verifici actele la primărie' },
      { label: 'Nu uita', value: 'Teren, fundație, racorduri' },
      { label: 'Compari', value: 'Ce include oferta, nu titlul' },
      { label: 'Contract', value: 'Etape, specificații, garanție' },
    ] }),
    node('intro', 'text', { body: para(
      'Casele modulare și cele pe structură ușoară mută o parte din lucrare din șantier în atelier. Asta poate aduce avantaje, dar nu elimină nevoia de teren pregătit, de fundație, de racorduri și de acte. Fiecare soluție are condiții proprii, de aceea merită să știi ce alegi.',
      'Pagina te ajută să identifici situația ta și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Containere de locuit', text: 'Module prefabricate pe structură metalică pentru locuit, birou sau anexă; contează izolația, terenul și actele.' },
      { title: 'Case modulare la cheie', text: 'Ce înseamnă „la cheie”, ce rămâne separat în ofertă și cum compari două propuneri.' },
      { title: 'Structură metalică sau lemn', text: 'Schelet metalic, schelet de lemn sau lemn masiv: cum diferă și ce se verifică la proiect și izolație.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Case modulare pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre case modulare' }),
    node('prices', 'price_links', { title: 'Prețuri pentru case modulare' }),
    node('steps', 'steps', { title: 'Cum decurge un proiect cu o firmă', items: [
      { title: 'Acte și teren', text: 'Întrebi la primărie ce se permite pe teren și ce documente se cer, apoi verifici accesul pentru transport.' },
      { title: 'Ofertă detaliată', text: 'Cere liste separate: module, transport, montaj, lucrări de teren, racorduri, finisaje și garanție.' },
      { title: 'Contract', text: 'Cu specificații, etape și plăți legate de execuție, nu doar de promisiuni.' },
      { title: 'Pregătirea terenului', text: 'Fundația sau reazemul, accesul și racordurile se fac înainte de sosirea modulelor.' },
      { title: 'Livrare și montaj', text: 'Modulele sunt aduse, ridicate și fixate, apoi se fac îmbinările și instalațiile.' },
      { title: 'Verificare și recepție', text: 'Se verifică izolația, etanșeitatea și funcționarea instalațiilor, apoi se predau documentele.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două oferte și compară-le pe aceleași rubrici: structura, izolația, finisajele, transportul, lucrările de teren, actele și garanția. O ofertă mult mai mică lasă de obicei ceva deoparte, de pildă fundația sau racordurile.',
      'Cere lucrări deja livrate pe care le poți vedea și un contract cu anexă de specificații. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre case modulare' }),
    node('firms', 'firms_list', { title: 'Firme de case modulare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte pentru o casă modulară?', text: 'Descrie proiectul și terenul și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
