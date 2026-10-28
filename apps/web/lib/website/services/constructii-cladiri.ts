import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "constructii-cladiri": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const constructiiCladiri: ServiceContent = {
  slug: 'constructii-cladiri',
  hub: true,
  seoTitle: 'Construcții de clădiri: situații, etape și firme',
  seoDescription: 'Construcții de clădiri pentru case și anexe: cum decurge lucrarea, ce acte și controale există, cum compari ofertele. Ghiduri, prețuri și firme verificate.',
  summary: 'Casă nouă, extindere sau supraetajare: cum decurge o construcție, cine răspunde de ce și cum compari ofertele firmelor de construcții.',
  preturi: [],
  intrebari: [
    'Cu ce încep dacă vreau să construiesc o casă? | Cu terenul și cu proiectul: verifici ce se poate construi pe teren (întrebi la primărie), alegi un proiectant și, după proiect, obții autorizația de construire. Constructorul se alege de obicei după ce proiectul este clar.',
    'Ce documente cer pentru lucrare? | Depinde de lucrare și de zonă. În general intră proiectul, autorizația de construire și documentele de recepție. Paginile despre autorizări și avize explică pașii, dar confirmarea o ai de la primărie.',
    'Care este rolul dirigintelui de șantier? | Verifică, în numele beneficiarului, dacă lucrarea se execută conform proiectului și semnează etapele critice. Detalii sunt pe pagina despre dirigintele de șantier.',
    'Cum se plătește o lucrare de construcții? | Pe etape, legate de lucrări terminate și verificate, conform contractului. Evită plata integrală în avans și cere totul în scris.',
    'Ce înseamnă manoperă și ce înseamnă la cheie? | Manopera e doar partea de lucru; la cheie include și materialele, uneori și actele. Cele două oferte nu se compară direct fără să afli ce intră în fiecare.',
    'Pot extinde sau supraetaja o casă existentă? | Doar după verificarea structurii de către un inginer. Fundația și zidurile existente trebuie să poată prelua încărcarea suplimentară; fără aceasta, lucrarea nu se începe.',
    'De ce depinde costul unei construcții? | De suprafață și complexitate, de structură și finisaje, de teren și acces, de sezon și de cât din lucrare e inclus. Paginile de preț explică factorii, fără cifre fără sursă.',
  ],
  sinonime: ['construcții civile', 'lucrări de construcții', 'construcții clădiri', 'casă nouă', 'structură casă', 'ridicare casă'],
  blocks: [
    node('hero', 'hero', { title: 'Construcții de clădiri', subtitle: 'Casă nouă, extindere sau supraetajare: etapele lucrării, ce verifici și cum compari ofertele. Descrie lucrarea și primești oferte gratuite de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Proiect și autorizație' },
      { label: 'Control', value: 'Diriginte de șantier' },
      { label: 'Compari', value: 'Manoperă, materiale, termene' },
      { label: 'Plata', value: 'Pe etape, în contract' },
    ] }),
    node('intro', 'text', { body: para(
      'Construcția unei case este o lucrare lungă, cu mai mulți specialiști și decizii care se leagă între ele. O alegere bună de la început, în proiect, firmă și contract, contează mai mult decât orice economie făcută pe parcurs.',
      'Pagina te ajută să vezi ansamblul și te trimite la pagina potrivită situației tale. Autorizațiile, dirigintele de șantier, prețurile și casele la cheie au pagini proprii, la care ajungi din secțiunile de mai jos.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Firmă de construcții și manoperă', text: 'Cine construiește, ce intră în manoperă, ce cuprinde contractul și cum compari ofertele pentru o casă nouă, o extindere sau o supraetajare.' },
      { title: 'Acte și autorizări', text: 'Proiectul și autorizația de construire se obțin înainte de lucrare. Pașii sunt explicați la autorizări și avize.' },
      { title: 'Controlul lucrării', text: 'Dirigintele de șantier verifică, în numele tău, dacă lucrarea respectă proiectul. Vezi pagina despre diriginte.' },
      { title: 'Fundații și structură', text: 'Fundația și structura se tratează la fundații și lucrări din beton și la zidărie.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Construcții de clădiri pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre construcții' }),
    node('prices', 'price_links', { title: 'Prețuri pentru construcții' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Proiect și teren', text: 'Studiul terenului și proiectul stabilesc soluția constructivă.' },
      { title: 'Autorizație', text: 'Se obține înainte de începerea lucrărilor; condițiile depind de primărie.' },
      { title: 'Contract', text: 'Contract scris cu lucrările, etapele de plată, termenele și garanția.' },
      { title: 'Execuție pe etape', text: 'Fundație, structură, acoperiș, instalații, finisaje, cu verificări înainte de acoperire.' },
      { title: 'Recepție', text: 'Verifici lucrarea și primești documentele și garanțiile.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte pe același conținut: ce lucrări sunt incluse, cine aduce materialele, ce termene și ce garanție se dau. Compară și experiența firmei pe lucrări similare.',
      'Cere să vezi o casă terminată și una în lucru, și discută cu foști clienți. Pe IntraConstruct vezi firmele verificate și recenziile.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: construcții de clădiri' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte de la firme din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
