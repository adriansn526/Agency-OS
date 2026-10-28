import { node, para, type ServiceContent } from './types'

/** Pillar page of the hub "Evaluare imobiliară": presents the situations and sends to the guides and price pages. No price table of its own. */
export const evaluareImobiliara: ServiceContent = {
  slug: 'evaluare-imobiliara',
  hub: true,
  seoTitle: 'Evaluare imobiliară: raport, evaluatori și ce să știi',
  seoDescription: 'Evaluare imobiliară pentru credit, vânzare sau succesiune: evaluatorul autorizat ANEVAR, scopul raportului și cum compari ofertele.',
  summary: 'Raport de evaluare pentru credit, vânzare, succesiune sau alt scop: cine îl face, de ce contează scopul și cum compari ofertele evaluatorilor.',
  preturi: [],
  intrebari: [
    'Cine poate face o evaluare imobiliară? | Un evaluator autorizat, membru al asociației profesionale din domeniu (ANEVAR). Cere dovada autorizării.',
    'De ce contează scopul raportului? | Raportul se întocmește pentru un scop declarat și nu se poate folosi automat pentru altul. Banca sau instituția îți spune ce cere.',
    'Banca acceptă orice evaluator? | De obicei nu; are evaluatori sau firme pe care le acceptă. Întreabă înainte de comandă.',
    'Ce documente trebuie să pregătesc? | Acte de proprietate, extras de carte funciară, planuri și altele privind imobilul. Evaluatorul îți spune lista exactă.',
    'Cât costă o evaluare? | Depinde de imobil, scop, documente, deplasare și urgență. Compară ofertele pe conținut; paginile de prețuri explică factorii.',
    'Cât timp este valabil raportul? | Depinde de instituția căreia i-l prezinți. Întreabă-o și clarifică cu evaluatorul înainte de comandă.',
  ],
  sinonime: ['evaluare proprietati', 'evaluare proprietăți', 'evaluare teren', 'evaluare casa', 'evaluator autorizat', 'firme evaluare'],
  blocks: [
    node('hero', 'hero', { title: 'Evaluare imobiliară', subtitle: 'Raport întocmit de un evaluator autorizat, pentru scopul tău. Descrie imobilul și primești oferte de la evaluatori verificați, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine face', value: 'Evaluator autorizat ANEVAR' },
      { label: 'Esențial', value: 'Scopul raportului' },
      { label: 'Ce ceri', value: 'Ofertă scrisă' },
      { label: 'Banca', value: 'Întreabă ce evaluatori acceptă' },
    ] }),
    node('intro', 'text', { body: para(
      'Evaluarea imobiliară stabilește, într-un raport scris, valoarea unui imobil pentru un scop precis. Cine primește raportul (banca, notarul, o instituție) poate avea cerințe proprii, deci scopul se clarifică de la început.',
      'Pagina te ajută să înțelegi ce presupune comanda și ce întrebi evaluatorului. La final poți cere oferte gratuite.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Evaluare imobiliară: raport ANEVAR', text: 'Cine face evaluarea, ce documente ceri, cum depinde raportul de scop și de ce depinde costul.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Evaluare imobiliară pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('prices', 'price_links', { title: 'Prețuri: evaluare imobiliară' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Stabilești scopul', text: 'Credit, vânzare, succesiune sau altceva.' },
      { title: 'Alegi evaluatorul', text: 'Verifici autorizarea și, dacă e cazul, aprobarea băncii.' },
      { title: 'Ofertă și contract', text: 'Cu scopul, documentele cerute și costul scrise.' },
      { title: 'Inspecție și documente', text: 'Evaluatorul vede imobilul și analizează actele.' },
      { title: 'Raportul', text: 'Primești raportul și poți cere clarificări.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere dovada autorizării, întreabă ce experiență are evaluatorul cu tipul tău de imobil și, dacă raportul e pentru credit, dacă este acceptat de banca ta. Cere oferte scrise și compară-le pe aceleași criterii.',
      'Clarifică scopul, documentele și ce cuprinde oferta. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: evaluare imobiliară' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
