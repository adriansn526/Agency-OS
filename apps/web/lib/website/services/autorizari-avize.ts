import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "autorizări și avize": presents the situations and sends to guides and price pages. No price table of its own.
 */
export const autorizariAvize: ServiceContent = {
  slug: 'autorizari-avize',
  hub: true,
  seoTitle: 'Autorizări și avize: etape, roluri și specialiști',
  seoDescription: 'Certificat de urbanism, autorizație de construire și aviz ISU: cine face ce, ce verifici la primărie și cum alegi un specialist. Actele variază.',
  summary: 'Certificat de urbanism, autorizație de construire și aviz ISU: etapele, rolurile și cum alegi un proiectant sau un specialist.',
  preturi: [],
  intrebari: [
    'Care este diferența dintre certificatul de urbanism și autorizația de construire? | Certificatul informează despre ce se poate face și ce avize se cer; autorizația permite efectiv executarea lucrării. De obicei prima precede pe a doua.',
    'Când am nevoie de autorizație? | Depinde de lucrare, de zonă și de clădire. Întreabă la primărie înainte să începi.',
    'Ce acte se cer? | Lista variază de la o primărie la alta și se schimbă. Verifică la instituție sau pe site-ul ei.',
    'Cât costă o autorizare? | Taxele se stabilesc prin reglementări locale și legale; la ele se adaugă onorariul proiectantului. Paginile de preț explică factorii.',
    'Pot face singur dosarul? | Documentația tehnică o semnează specialiști atestați. Unele acte le poți depune singur, dar un proiectant scurtează procedura.',
    'Ce risc am dacă lucrez fără acte? | Amenzi, oprirea lucrării, obligația de legalizare sau, în unele cazuri, desființare, plus greutăți la vânzare, intabulare sau credit.',
  ],
  sinonime: ['autorizații și avize', 'avize pentru construcții', 'acte pentru construcție', 'dosar de autorizare', 'proiectant autorizat'],
  blocks: [
    node('hero', 'hero', { title: 'Autorizări și avize', subtitle: 'Certificat de urbanism, autorizație de construire sau aviz ISU: etape și roluri. Actele, taxele și termenele variază; le verifici la instituție. Poți cere oferte de la specialiști.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Procedura', value: 'Se verifică la primărie sau la instituție' },
      { label: 'Documentația', value: 'Specialiști atestați' },
      { label: 'Actele și taxele', value: 'Variază, se schimbă' },
      { label: 'Fără autorizație', value: 'Riscuri la vânzare' },
    ] }),
    node('intro', 'text', { body: para(
      'Autorizările și avizele sunt pașii prin care o lucrare ajunge să fie permisă de instituțiile competente. Sunt reglementate, iar procedurile, actele și taxele diferă de la o primărie la alta și se schimbă.',
      'Pagina explică la nivel de etape și roluri cine face ce și te trimite la pagina potrivită. Nu dă liste de acte sau taxe: pentru ele, verifică la primărie sau pe site-ul instituției.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Certificat de urbanism', text: 'Act de informare și condiționare, de obicei primul pas; arată ce se poate face cu terenul și ce avize urmează.' },
      { title: 'Autorizație de construire', text: 'Permite lucrarea, pe baza unui proiect și a avizelor. Rolurile: proprietar, proiectant, verificatori, primărie.' },
      { title: 'Autorizare și aviz ISU', text: 'Securitate la incendiu, pentru clădiri și activități la care se cere, cu documentație de la specialist atestat.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Autorizări și avize pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre autorizări' }),
    node('prices', 'price_links', { title: 'Prețuri pentru proiectare și construcții' }),
    node('steps', 'steps', { title: 'Cum decurge, pe scurt', items: [
      { title: 'Informare la instituție', text: 'Afli dacă lucrarea cere acte și ce procedură se aplică acum.' },
      { title: 'Alegerea specialistului', text: 'Un proiectant sau un birou de specialitate pregătește documentația.' },
      { title: 'Dosar și avize', text: 'Documentele și avizele se obțin conform cerințelor instituțiilor.' },
      { title: 'Depunere și urmărire', text: 'Dosarul se depune, iar completările cerute se aduc la timp.' },
      { title: 'Respectarea condițiilor', text: 'Lucrarea se execută conform actelor obținute.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma sau specialistul', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere ofertă scrisă, cu etapele, ce include (dosar, depunere, urmărire) și ce taxe rămân în sarcina ta. Verifică atestările specialiștilor pentru tipul lucrării.',
      'Nu accepta promisiuni de rezultat sigur sau termene garantate: decizia aparține instituțiilor. Pe IntraConstruct vezi firmele verificate și recenziile.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: autorizări și avize' }),
    node('firms', 'firms_list', { title: 'Specialiști pentru autorizări', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de ajutor cu dosarul?', text: 'Descrie lucrarea și primești oferte de la specialiști din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
