import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "instalații sanitare": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const instalatiiSanitare: ServiceContent = {
  slug: 'instalatii-sanitare',
  hub: true,
  seoTitle: 'Instalații sanitare: situații, ghiduri și instalatori',
  seoDescription: 'Instalații sanitare pentru casă și apartament: conducte, obiecte sanitare, desfundare, fosă septică. Ghiduri, prețuri și instalatori verificați.',
  summary: 'Instalator sanitar: montaj, reparații, canalizare și fosă septică. Ce situații există, cum le alegi și cum compari ofertele firmelor.',
  sinonime: ['instalator', 'instalații sanitare', 'conducte apă', 'PPR', 'obiecte sanitare', 'boiler', 'scurgeri'],
  preturi: [],
  intrebari: [
    'Ce lucrări face un instalator sanitar? | Montează și schimbă conducte de apă și de scurgere, obiecte sanitare, baterii și boilere, remediază scurgeri și rezolvă probleme de canalizare. Pentru dopuri și pentru fosă septică există ghiduri dedicate, mai jos.',
    'Cât costă un instalator sanitar? | Depinde de tipul lucrării, de numărul de puncte sanitare, de materiale și de accesul la trasee. Cere un preț pe punct sanitar sau pe lucrare, nu doar pe oră; paginile de prețuri de mai jos explică factorii.',
    'Cum se face desfundarea canalizării? | Metoda se alege după locul și cauza dopului; pentru dopuri repetate se verifică traseul. Ghidul despre desfundare explică metodele, ce poți încerca singur și când chemi o firmă.',
    'Ce conducte să aleg pentru apă? | Se folosesc de obicei conducte din PPR sau PEX, fiecare cu avantaje și cerințe de montaj proprii. Alegerea o discuți cu instalatorul, în funcție de locuință și de traseu.',
    'Ce este proba de presiune? | Un test în care instalația se umple și se ține sub presiune un timp, ca să se vadă dacă există scurgeri înainte de acoperirea țevilor. Cere-o înainte de a închide pereții.',
    'Pot schimba coloana de apă sau de canalizare din bloc? | Coloanele sunt în general parte comună a clădirii; lucrările la ele se discută cu asociația de proprietari. Pentru ce poți modifica în apartament, întreabă instalatorul și asociația.',
    'Ce garanție ar trebui să primesc? | Cere garanția pentru manoperă în scris și păstrează factura și documentele produselor. Fotografiile traseelor înainte de acoperire sunt o dovadă utilă dacă apar probleme.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Instalații sanitare', subtitle: 'Conducte, obiecte sanitare, canalizare și fosă septică: ce situații există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații', 'Firme verificate'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Vizită și schiță' },
      { label: 'Compari', value: 'Preț pe punct sanitar' },
      { label: 'Verificare', value: 'Probă de presiune' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'O instalație sanitară bună nu se observă, dar o scurgere ascunsă într-un perete strică tencuieli, gresie și poate afecta vecinii. Cele mai multe probleme apar la îmbinări, la presiune și la pante greșite pe scurgeri.',
      'Pagina aceasta te ajută să identifici situația și te trimite la ghidul potrivit. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Desfundare canalizare', text: 'Dopuri în scurgeri și canalizare: ghidul explică cauzele, metodele și când chemi o firmă.' },
      { title: 'Fosă septică și stație de epurare', text: 'Alegerea soluției, montajul, drenajul și vidanjarea: ghidul arată ce compari în oferte.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Instalații sanitare pe situații' }),
    node('other-h', 'heading', { text: 'Alte lucrări sanitare', level: 'h2' }),
    node('other', 'text', { body: para(
      'Instalațiile de apă (alimentare și scurgere), obiectele sanitare, boilerul sau centrala se rezolvă tot cu un instalator. Oferta trebuie să spună materialul conductelor, obiectele montate și ce se întâmplă cu spargerile și refacerile.',
    ) }),
    node('guides', 'guide_links', { title: 'Ghiduri despre instalații sanitare' }),
    node('prices', 'price_links', { title: 'Prețuri pentru instalații sanitare' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Vizită și schiță', text: 'Instalatorul verifică traseele și poziția obiectelor și stabilește punctele sanitare.' },
      { title: 'Ofertă pe punct sanitar', text: 'Oferta enumeră punctele, materialul conductelor și obiectele montate. Compară oferte cu același conținut.' },
      { title: 'Contract', text: 'Contract scris, cu termenul și garanția pentru manoperă. Evită plata integrală în avans.' },
      { title: 'Execuție și probă de presiune', text: 'Conductele se montează cu pante corecte, iar instalația se testează sub presiune înainte de acoperire.' },
      { title: 'Montaj obiecte și recepție', text: 'După finisaje se montează obiectele și bateriile; verifici scurgerea, presiunea și etanșeitatea.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi instalatorul', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere un preț pe punct sanitar sau pe lucrare, nu doar un tarif pe oră. Întreabă dacă face proba de presiune și ce garanție dă pe manoperă.',
      'La înlocuirea conductelor, cere să vezi traseele înainte de acoperire și fă fotografii. Pentru urgențe, verifică dinainte disponibilitatea și condițiile de deplasare.',
      'Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre instalații sanitare' }),
    node('firms', 'firms_list', { title: 'Firme de instalații sanitare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
