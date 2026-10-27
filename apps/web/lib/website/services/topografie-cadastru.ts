import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "topografie și cadastru": presents the situations and sends to guides and price pages. No price table of its own.
 */
export const topografieCadastru: ServiceContent = {
  slug: 'topografie-cadastru',
  hub: true,
  seoTitle: 'Topografie și cadastru: măsurători, intabulare, firme',
  seoDescription: 'Măsurători topografice, plan de situație, cadastru și intabulare: cine face ce, ce verifici la OCPI și cum alegi un specialist. Ghiduri, prețuri și firme.',
  summary: 'Măsurători topografice, plan de situație, cadastru și intabulare: cine face ce și cum alegi și compari specialiștii.',
  preturi: [],
  intrebari: [
    'Când am nevoie de topograf? | Înainte de proiectare sau construcție, la dezmembrări, la intabulare, la clarificarea limitelor și când o instituție cere plan actualizat.',
    'Ce înseamnă intabulare? | Înscrierea dreptului de proprietate în cartea funciară, la OCPI. Pentru multe imobile cere o documentație cadastrală.',
    'Ce acte se cer? | Variază în funcție de imobil și de instituție și se schimbă. Verifică la OCPI sau la notar.',
    'Cât costă? | Depinde de suprafață, relief, acces, scop și de tarifele instituțiilor. Paginile de preț explică factorii.',
    'Cine poate face documentația? | Persoane autorizate în domeniu. Cere dovada autorizării.',
    'Pot rezolva totul singur? | Unele pași da, dar măsurătorile pentru instituții cer specialist autorizat, iar actele juridice, notar.',
  ],
  sinonime: ['topografie', 'cadastru', 'măsurători teren', 'firmă de topografie', 'documentații cadastrale', 'carte funciară'],
  blocks: [
    node('hero', 'hero', { title: 'Topografie și cadastru', subtitle: 'Măsurători, plan de situație, cadastru și intabulare: cine face ce și cum compari ofertele. Actele și taxele variază; le verifici la OCPI. Poți cere oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Măsurători', value: 'Topograf autorizat' },
      { label: 'Înscriere', value: 'OCPI și notar' },
      { label: 'Actele și taxele', value: 'Verifică la instituții' },
      { label: 'Oferta', value: 'Scop, livrabile, acces' },
    ] }),
    node('intro', 'text', { body: para(
      'Topografia stabilește limitele și poziția pe teren, iar cadastrul și cartea funciară le leagă de dreptul de proprietate. Împreună, ele decid cât de sigură e proprietatea și cât de ușor se vinde, se construiește pe ea sau se ipotechează.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. Procedurile, actele și tarifele variază și se schimbă; pentru ele, sursa corectă este OCPI sau notarul.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Cadastru și intabulare', text: 'Documentația cadastrală și înscrierea dreptului în cartea funciară, cu rolurile topografului, notarului și OCPI.' },
      { title: 'Topograf: măsurători și plan de situație', text: 'Ridicare topografică, plan de situație și trasare, cu întrebările de pus înainte de ofertă.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Topografie și cadastru pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre topografie și cadastru' }),
    node('prices', 'price_links', { title: 'Prețuri pentru topografie și cadastru' }),
    node('steps', 'steps', { title: 'Cum decurge, pe scurt', items: [
      { title: 'Clarifici ce ai nevoie', text: 'Măsurători, plan, dezmembrare sau intabulare. Fiecare are documentație proprie.' },
      { title: 'Verifici actele', text: 'Afli ce acte ai și ce lipsește, inclusiv pentru construcții.' },
      { title: 'Ofertă detaliată', text: 'Cere scopul, livrabilele, ce include și ce taxe rămân în sarcina ta.' },
      { title: 'Măsurători și documentație', text: 'Un specialist autorizat măsoară și întocmește documentele.' },
      { title: 'Depunere și urmărire', text: 'Dosarul merge la instituții; completările se aduc la timp.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma sau specialistul', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Verifică autorizarea specialistului și cere referințe pentru imobile similare. Compară ofertele pe același conținut: scop, livrabile, depunere, urmărire și taxe.',
      'Nu accepta promisiuni de rezultat sigur: decizia aparține instituțiilor. Pe IntraConstruct vezi firmele verificate și recenziile.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: topografie și cadastru' }),
    node('firms', 'firms_list', { title: 'Specialiști în topografie și cadastru', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de un specialist?', text: 'Descrie imobilul și ce ai nevoie și primești oferte de la specialiști din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
