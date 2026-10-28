import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "instalații de gaze": it presents the situations and sends to the guides and price pages (blocks that fill themselves with
 * what is published). No price table of its own. Gas is a safety topic: every intervention is done by authorized personnel and the page says so.
 */
export const instalatiiGaze: ServiceContent = {
  slug: 'instalatii-gaze',
  hub: true,
  seoTitle: 'Instalații de gaze: revizie, detector, instalator autorizat',
  seoDescription: 'Instalații de gaze pentru casă și apartament: ce lucrări cer firmă autorizată ANRE, cum verifici instalatorul, ce înseamnă revizia și cum compari ofertele.',
  summary: 'Revizie, detector de gaze și instalator autorizat: ce lucrări la instalația de gaze cer personal autorizat și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Cine are voie să lucreze la o instalație de gaze? | Doar firmele și persoanele autorizate de ANRE pentru tipul de lucrare. Asta include montajul, modificarea, revizia, verificarea și punerea în funcțiune. Nu face pe cont propriu nicio intervenție la conducte, robinete sau aparate.',
    'Cum verific dacă o firmă este autorizată? | Cere datele de autorizare și caută-le în listele oficiale de pe site-ul ANRE, înainte de a semna ceva. Situația „Instalator autorizat ANRE pentru gaze” explică pașii mai detaliat.',
    'Ce este revizia instalației de gaze? | Un control făcut de o firmă autorizată, care verifică dacă instalația și aparatele sunt în stare sigură și emite un document. Cât de des se face și ce obligații ai se verifică la distribuitorul de gaze sau la ANRE, pentru că regulile se pot schimba.',
    'Ce rol are un detector de gaze? | Avertizează când apare gaz în aer. Poate fi legat la o electrovalvă care oprește alimentarea. Nu previne scurgerile și nu înlocuiește revizia; montajul îl face personal autorizat.',
    'Ce fac dacă simt miros de gaz? | Ieși din încăpere, aerisește, nu aprinde nimic și nu folosi întrerupătoare. Sună de afară la numărul de urgență sau la distribuitor. Nu încerca să repari singur.',
    'Cine face racordarea la rețea? | Racordarea la rețeaua de distribuție este reglementată și se face prin operatorul din zona ta. Instalația din interior o face o firmă autorizată. Pașii și actele se verifică la distribuitor.',
    'De ce depinde costul unei lucrări la gaze? | De tipul lucrării, de lungimea traseului, de numărul de aparate, de starea instalației existente și de pașii administrativi. Compară ofertele pe conținut, nu doar pe preț. Paginile de prețuri de mai jos explică factorii.',
    'Ce documente trebuie să păstrez? | Contractul și ofertele, documentele lucrărilor și ale reviziilor, fișele aparatelor. Le ceri firmei la finalul lucrării; distribuitorul sau o altă firmă le poate cere ulterior.',
  ],
  sinonime: ['gaze', 'instalație de gaze', 'instalație de gaze casă', 'gaze naturale', 'conductă de gaze', 'racord gaze', 'siguranță gaze'],
  blocks: [
    node('hero', 'hero', { title: 'Instalații de gaze', subtitle: 'Revizie, detector, instalare: lucrări care cer firmă autorizată ANRE. Descrie ce ai nevoie și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine lucrează', value: 'Doar personal autorizat' },
      { label: 'Verifici', value: 'Lista oficială ANRE' },
      { label: 'Regulile', value: 'Se confirmă la distribuitor sau ANRE' },
      { label: 'Primești', value: 'Ofertă, contract și documente' },
    ] }),
    node('intro', 'text', { body: para(
      'Gazul este un subiect de siguranță înainte de a fi unul de preț. Un aragaz sau o centrală pe gaz funcționează fără probleme ani de zile, dar o instalație neverificată sau o lucrare făcută de cineva neautorizat poate duce la scurgeri și accidente. De aceea, lucrările de acest fel sunt rezervate persoanelor și firmelor autorizate.',
      'Pagina te ajută să înțelegi ce lucrări există, ce se verifică la o revizie, ce face un detector și cum alegi instalatorul. Regulile exacte, cu periodicități și obligații, se confirmă la distribuitorul din zona ta sau la ANRE; nu le repetăm aici ca să nu devină depășite.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Revizie și verificare', text: 'Controlul instalației și al aparatelor de către o firmă autorizată, cu document la final. Pagina explică ce se verifică și ce întrebi.' },
      { title: 'Detector și senzor de gaze', text: 'Aparatul care alertează la prezența gazului, cu sau fără electrovalvă. Montajul îl face personal autorizat.' },
      { title: 'Instalator autorizat ANRE', text: 'Cum verifici autorizarea pe lista oficială, ce lucrări nu se fac fără ea și cum compari ofertele.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Instalații de gaze pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre instalații de gaze' }),
    node('prices', 'price_links', { title: 'Prețuri pentru instalații de gaze' }),
    node('safety-h', 'heading', { text: 'Dacă simți miros de gaz', level: 'h2' }),
    node('safety', 'text', { body: para(
      'Ieși din încăpere, aerisește, nu aprinde nimic și nu folosi întrerupătoare. Sună de afară la numărul de urgență sau la distribuitor. Regula este generală; urmează și indicațiile distribuitorului din zona ta. Nu căuta și nu repara scurgerea singur.',
    ) }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Verifici firma', text: 'Ceri datele de autorizare și le cauți pe site-ul ANRE înainte de a o chema.' },
      { title: 'Vizită și ofertă', text: 'Firma vede locul, stabilește ce este necesar și face o ofertă scrisă, cu materiale, manoperă și documente.' },
      { title: 'Contract', text: 'Contractul scris spune ce se execută, cine se ocupă de pașii cu distribuitorul și ce garanție primești.' },
      { title: 'Execuție', text: 'Lucrarea se face doar de personal autorizat. Tu nu intervii asupra instalației.' },
      { title: 'Verificări și documente', text: 'Controlul final și predarea documentelor; punerea în funcțiune urmează procedura distribuitorului.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două oferte și compară-le pe aceleași criterii: ce lucrare cuprind, ce materiale sunt incluse, ce teste se fac, ce documente primești și cine se ocupă de legătura cu distribuitorul. O ofertă mult mai mică poate omite exact verificările care contează.',
      'Verifică întotdeauna autorizarea pe lista oficială și evită ofertele care propun să omiți pașii formali. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre instalațiile de gaze' }),
    node('firms', 'firms_list', { title: 'Firme de instalații de gaze', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de o lucrare la instalația de gaze?', text: 'Descrie ce ai nevoie și primești oferte de la firme autorizate și verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
