import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "geamuri": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages, so the page does not compete with them.
 */
export const geamuri: ServiceContent = {
  slug: 'geamuri',
  hub: true,
  seoTitle: 'Geamuri termopan: situații, soluții și firme verificate',
  seoDescription: 'Ferestre și geamuri termopan PVC: ce alegi, cum compari ofertele și ce lucrări poți cere (reglaj, uși, rulouri). Ghiduri, prețuri și firme verificate.',
  summary: 'Ferestre și geamuri termopan, reglaje, uși și rulouri: ce soluții există, cum le alegi și cum compari ofertele firmelor.',
  sinonime: ['termopane', 'ferestre PVC', 'geam termopan', 'tâmplărie PVC', 'vitraje', 'geamuri', 'ferestre'],
  preturi: [],
  intrebari: [
    'De ce depinde prețul unei ferestre termopan? | De profil, de tipul de geam, de feronerie, de dimensiuni, de culoare și de montaj. Compară ofertele pe același tip de profil și aceeași sticlă, nu doar pe preț. Paginile de prețuri de mai jos explică factorii.',
    'Geam dublu sau triplu? | Pentru majoritatea locuințelor un geam dublu cu strat termoizolant este o alegere obișnuită. Triplul are sens mai ales la clădiri bine izolate sau pe fațade expuse la zgomot și vânt; dacă pereții sunt slab izolați, câștigul real este mic. Discută cu firma, după vizită.',
    'Contează numărul de camere al profilului? | Da, un profil cu mai multe camere izolează în general mai bine, dar diferența se vede doar dacă montajul este făcut corect, cu spumă, benzi de etanșare și șpalet bine închis. Un montaj slab strică și cel mai bun profil.',
    'Pot monta ferestrele singur? | Se poate, dar greșelile de nivelare, fixare și etanșare duc la curenți de aer și condens, iar garanția pentru montaj nu mai are cine s-o acorde. Alege de preferat o firmă care face montajul și oferă garanția în scris.',
    'Am nevoie de acord ca să schimb ferestrele în bloc? | Dacă schimbi aspectul fațadei (culoare, tip de deschidere), de multe ori este nevoie de acordul asociației de proprietari. Întreabă asociația și, dacă e cazul, primăria ce reguli se aplică înainte să comanzi.',
    'Ce înseamnă când geamul face condens între foi? | Spațiul dintre foi este etanș. Dacă apare apă acolo, etanșarea s-a stricat și pachetul de sticlă trebuie înlocuit; dacă mai există garanție, verifică ce acoperă. Un specialist poate spune dacă ramele pot rămâne.',
    'Ce garanție ar trebui să ofere firma? | Cere în scris garanția pentru produs și, separat, pentru montaj, cu condițiile ei. Nu te baza pe promisiuni verbale și păstrează contractul și documentele.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Geamuri și ferestre termopan', subtitle: 'Ferestre PVC, uși, reglaje și rulouri: ce soluții există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații', 'Firme verificate'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Măsurători la fața locului' },
      { label: 'Compari', value: 'Profil, sticlă, feronerie' },
      { label: 'Montaj', value: 'Contează cât produsul' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'Ferestrele sunt locul pe unde se pierde mult din căldura unei locuințe, dar calitatea depinde la fel de mult de montaj ca de profil. Un profil bun, montat cu spumă proastă și fără bandă de etanșare, lasă curent și face condens.',
      'Pagina aceasta te ajută să identifici situația și te trimite la ghidul potrivit. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Reparații și reglaj termopane', text: 'Ferestre care nu se închid bine, garnituri uzate, feronerie blocată sau geam spart: vezi ce se poate regla sau repara și cine face lucrarea.' },
      { title: 'Uși termopan', text: 'Ușa de intrare sau de balcon din PVC: ce întrebi înainte de comandă, cum se montează și de ce depinde costul.' },
      { title: 'Uși culisante și glisante', text: 'Pentru terasă sau interior, cu sistem termopan sau din sticlă: diferențele dintre sisteme și ce verifici la montaj.' },
      { title: 'Rulouri și jaluzele exterioare', text: 'Protecție la soare și intimitate, cu comandă manuală sau electrică: ce tipuri există și cum se montează.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Geamuri și tâmplărie pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre geamuri și tâmplărie' }),
    node('prices', 'price_links', { title: 'Prețuri pentru geamuri și termopane' }),
    node('steps', 'steps', { title: 'Cum decurge comanda', items: [
      { title: 'Măsurători la fața locului', text: 'Firma măsoară golurile, verifică starea șpaleților și propune tipul de deschidere. Nu comanda după măsuri luate de tine.' },
      { title: 'Ofertă pe specificații', text: 'Oferta spune profilul, tipul de geam, feroneria și culoarea. Compară oferte cu aceleași specificații.' },
      { title: 'Contract și avans', text: 'Contract scris cu termen de livrare și garanție. Evită plata integrală în avans.' },
      { title: 'Producție și montaj', text: 'Demontarea tâmplăriei vechi, montaj cu spumă și benzi de etanșare, apoi reglajul ferestrelor.' },
      { title: 'Finisaje și recepție', text: 'Glafuri, șpalet și tencuială de închidere. Verifici închiderea, etanșarea și zgârieturile înainte de a semna.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere oferta pe specificații: profilul, tipul și grosimea sticlei, feroneria și ce include montajul (demontare, spumă, glafuri, evacuare). Un preț mic fără aceste detalii duce de obicei la suplimente.',
      'Întreabă dacă montajul este făcut de echipa firmei și ce garanție acordă pentru montaj, nu doar pentru produs. Cere referințe sau poze cu lucrări similare.',
      'Verifică ferestrele la recepție: închiderea, zgârieturile pe sticlă și profil, etanșarea și curățenia după lucrare. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre geamuri termopan' }),
    node('firms', 'firms_list', { title: 'Firme de geamuri și termopane', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
