import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "renovări și amenajări interioare": presents the situations and sends to guides and price pages. No price table of its own.
 */
export const renovariAmenajariInterioare: ServiceContent = {
  slug: 'renovari-amenajari-interioare',
  hub: true,
  seoTitle: 'Renovări și amenajări interioare: situații și firme',
  seoDescription: 'Renovare de baie sau apartament: ordinea lucrărilor, ce cere acord, cum compari ofertele. Ghiduri, prețuri și firme verificate pentru amenajări interioare.',
  summary: 'Renovare de baie sau de apartament: ordinea lucrărilor, ce cere acord în bloc și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Cu ce încep o renovare? | Cu un plan și o verificare a instalațiilor. Ele decid cât de adânc intervii și ce ordine urmezi.',
    'Am nevoie de autorizație pentru renovare? | Pentru finisaje, de obicei nu. Mutarea sau demolarea pereților și modificarea instalațiilor comune pot cere acte și acord. Depinde, deci întreabă la primărie și la asociație.',
    'Cât costă o renovare? | Depinde de suprafață, de cât se demolează, de starea instalațiilor, de materiale și de acces. Paginile de preț de mai jos explică factorii.',
    'Pot face singur o parte din lucrări? | Finisaje simple, uneori da. Instalațiile electrice și de gaz, hidroizolația și intervențiile în structură cer personal calificat.',
    'Cum compar două oferte? | Pe același conținut: lucrări, materiale, etape, termen, evacuare moloz și garanție pentru manoperă.',
    'Cât durează o renovare? | Depinde de amploare și de coordonarea echipelor. Cere un grafic pe etape în ofertă.',
  ],
  sinonime: ['renovări interioare', 'lucrări de renovare', 'firme de renovări', 'amenajări locuință', 'renovare casă', 'renovare completă'],
  blocks: [
    node('hero', 'hero', { title: 'Renovări și amenajări interioare', subtitle: 'Baie sau apartament: ordinea lucrărilor, ce se verifică înainte și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Plan și verificarea instalațiilor' },
      { label: 'Ordinea', value: 'Lucrări umede înaintea finisajelor' },
      { label: 'În bloc', value: 'Întreabă asociația' },
      { label: 'Oferta', value: 'Etape, materiale, garanție' },
    ] }),
    node('intro', 'text', { body: para(
      'O renovare adună mai multe meserii într-o ordine care nu se poate schimba: ce e ascuns sub finisaje se termină înaintea finisajelor. Cine respectă ordinea evită refaceri și blocaje între echipe.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Renovare baie', text: 'Plan, instalații, hidroizolație, placări și obiecte sanitare, în ordinea care evită refacerile.' },
      { title: 'Renovare apartament', text: 'Etape, acorduri în bloc și coordonarea echipelor, de la demolări la finisaje.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Renovări pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre renovări' }),
    node('prices', 'price_links', { title: 'Prețuri pentru renovări' }),
    node('steps', 'steps', { title: 'Cum decurge, pe scurt', items: [
      { title: 'Plan și buget', text: 'Stabilești ce se păstrează și ce se schimbă, înainte să angajezi echipe.' },
      { title: 'Verificări și acorduri', text: 'Instalațiile și elementele structurale se verifică; ce atinge zone comune se întreabă la asociație.' },
      { title: 'Ofertă detaliată', text: 'Cere lista de lucrări, materialele, etapele, termenul și garanția manoperei.' },
      { title: 'Contract și plată pe etape', text: 'Contract scris, cu plată pe etape și recepție.' },
      { title: 'Execuție și recepție', text: 'Lucrări umede, apoi finisaje; verifici fiecare etapă înainte de acoperire.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma sau specialistul', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: lista de lucrări, materialele și cine le cumpără, coordonarea echipelor, termenul, evacuarea molozului și garanția. O ofertă fără detalii nu se poate compara.',
      'Întreabă ce lucrări similare a făcut firma și cere referințe. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: renovări și amenajări interioare' }),
    node('firms', 'firms_list', { title: 'Firme de renovări', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca renovarea să o facă o firmă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
