import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "pardoseli și placări": it presents the situations and sends to the guides and price pages (blocks that fill themselves with
 * what is published). It has no price table of its own: prices live in the dedicated price pages, so the page does not compete with them.
 */
export const pardoseliPlacari: ServiceContent = {
  slug: 'pardoseli-placari',
  hub: true,
  seoTitle: 'Pardoseli și placări: situații, ghiduri și firme',
  seoDescription: 'Pardoseli și placări: ce soluții există, cum pregătești suportul și cum compari ofertele. Ghiduri, pagini de prețuri și firme verificate din zona ta.',
  summary: 'Pardoseli epoxidice, parchet, gresie, faianță și microciment: ce alegi, cum pregătești suportul și cum compari ofertele firmelor.',
  sinonime: ['pardoseli', 'placări', 'finisaje de pardoseală', 'montaj pardoseli', 'finisaje interioare'],
  preturi: [],
  intrebari: [
    'Cât costă o pardoseală sau o placare? | Depinde de suprafață, de material, de starea suportului, de formatul plăcilor sau de sistemul ales și de ce pregătire cere locul. Compară ofertele pe conținut: manoperă, materiale, pregătirea suportului, hidroizolația și evacuarea resturilor. Paginile de prețuri de mai jos explică factorii pentru fiecare lucrare.',
    'De ce contează suportul mai mult decât materialul? | Pe o șapă neplană, umedă sau fisurată orice finisaj se desprinde, crapă sau se umflă, oricât de scump ar fi. Firma ar trebui să verifice planeitatea și umiditatea înainte de ofertă și să propună pregătirea necesară.',
    'Cât trebuie să aștept după turnarea șapei? | Timpul depinde de tipul șapei, de grosime și de condițiile din încăpere; urmează fișa produsului și recomandarea firmei. Un montaj făcut prea devreme duce la parchet umflat, gresie desprinsă sau rășină care nu aderă.',
    'Cum aleg între parchet, gresie, epoxidic sau microciment? | Pornește de la încăpere și de uz: zonele umede cer hidroizolație și finisaje rezistente la apă, spațiile cu trafic intens cer rezistență la uzură, iar estetica sau lipsa rosturilor contează în alte cazuri. Ghidurile de pe situații compară soluțiile.',
    'Ce se verifică la recepția lucrării? | Nivelul și planeitatea, rosturile, sunetul la lovire (o placă desprinsă sună a gol), plintele și sigilările, curățenia și aspectul finisajului. Notează observațiile înainte să semnezi recepția.',
    'De ce se desprinde gresia sau faianța? | Cauzele frecvente sunt adezivul nepotrivit, suprafața nepregătită (praf, umezeală) și lipsa rosturilor de dilatare. Cere adezivul recomandat pentru tipul de placă și pentru suport.',
    'Hidroizolația băii intră în lucrare? | Hidroizolația sub gresie și faianță în zonele umede este o etapă separată, tratată în categoria de hidroizolații. Verifică dacă oferta o include sau dacă o contractezi distinct.',
    'Pot face singur lucrarea? | Pe suprafețe mici și simple, urmând fișa tehnică, uneori da. Pentru sisteme continue (epoxidic, microciment), formate mari sau zone umede, lucrarea cere meșter cu experiență, pentru că greșelile se văd abia după finisare.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Pardoseli și placări', subtitle: 'Pardoseli epoxidice, parchet, gresie, faianță și microciment. Descrie lucrarea și primești oferte de la firme verificate, gratuit.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații', 'Firme verificate'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Verificarea suportului' },
      { label: 'Contează cel mai mult', value: 'Planeitate și uscare' },
      { label: 'Compari', value: 'Materiale, pregătire, manoperă' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'Pardoseala și placările se văd zilnic, dar rezultatul depinde de ce nu se vede: planeitatea șapei, hidroizolația, adezivul potrivit și rosturile de dilatare. Pe un suport prost pregătit, orice material, oricât de scump, se desprinde sau crapă.',
      'Pagina aceasta te ajută să identifici situația și te trimite la ghidul potrivit. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Pardoseală epoxidică', text: 'Suprafață continuă, rezistentă și ușor de curățat; reușita depinde de pregătirea suportului și de ordinea straturilor.' },
      { title: 'Montaj parchet', text: 'Laminat sau SPC cu sistem click: contează planeitatea, uscarea șapei și rosturile perimetrale; ghidul explică ordinea lucrărilor.' },
      { title: 'Montaj gresie și faianță', text: 'Ordinea de montaj, adezivul potrivit, rosturile și formatele mari fac diferența dintre o lucrare care ține și una care se desprinde.' },
      { title: 'Microciment și poliuretan', text: 'Finisaj continuu, fără rosturi, aplicat în straturi; cere suport corect și meșter cu experiență în sistemul ales.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Pardoseli și placări pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre pardoseli și placări' }),
    node('prices', 'price_links', { title: 'Prețuri pentru pardoseli și placări' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Măsurători și verificarea suportului', text: 'Firma verifică planeitatea și umiditatea suportului și propune pregătirea necesară.' },
      { title: 'Ofertă pe suprafață', text: 'Cere suprafața, materialul, pregătirea suportului, hidroizolația unde e cazul, evacuarea resturilor, termenul și garanția.' },
      { title: 'Contract și avans', text: 'Contract scris, cu garanția pentru manoperă. Evită plata integrală în avans.' },
      { title: 'Pregătirea suportului și montaj', text: 'Șlefuire, amorsare sau nivelare, apoi montajul cu adeziv adecvat sau aplicarea straturilor de sistem.' },
      { title: 'Rostuire, finisaje și recepție', text: 'Rosturi, plinte, sigilări. Verifici nivelul, rosturile, sunetul la lovire și curățenia, apoi primești garanția scrisă.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere ofertă pe suprafață și compară-le pe aceeași listă: pregătirea suportului, hidroizolația, adezivul sau sistemul folosit, rosturile, plintele și evacuarea. O ofertă mult mai mică lasă de obicei deoparte un pas important.',
      'Întreabă ce produse folosesc și dacă respectă timpii de uscare, iar la formate mari sau sisteme continue cere poze cu lucrări similare. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre pardoseli și placări' }),
    node('areas', 'areas', { title: 'Unde găsești firme pentru pardoseli' }),
    node('firms', 'firms_list', { title: 'Firme pentru pardoseli și placări', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
