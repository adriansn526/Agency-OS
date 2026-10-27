import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "amenajări grădini și peisagistică": it presents the situations and sends to the guides and price pages (blocks that fill
 * themselves with what is published). It has no price table of its own.
 */
export const amenajariGradini: ServiceContent = {
  slug: 'amenajari-gradini',
  hub: true,
  seoTitle: 'Amenajări grădini și peisagistică: situații și firme',
  seoDescription: 'Amenajarea grădinii, gazon, irigații și gard viu: ce etape are lucrarea, cum alegi și cum compari ofertele. Ghiduri, prețuri și firme verificate.',
  summary: 'Amenajarea grădinii și a curții, gazon și irigații, gard viu: cum se planifică lucrarea, ce implică instalațiile și cum compari ofertele.',
  preturi: [],
  intrebari: [
    'Ce lucrări intră la amenajări de grădini? | Proiect peisagistic, lucrări de teren, alei, gazon, plantări, gard viu, iluminat și irigații. Fiecare situație are pagina ei mai jos.',
    'Cu ce încep amenajarea? | Cu un plan pe zone și cu lucrările de structură: nivelare, scurgerea apei și traseele de instalații. Plantările vin după, ca să nu fie stricate de utilaje.',
    'Am nevoie de proiect peisagistic? | Pentru o curte mică și simplă, un plan pe hârtie poate fi suficient. Pentru terenuri mari, cu denivelări sau cu instalații, un proiect evită greșeli greu de reparat.',
    'Cine face instalațiile de apă și curent din grădină? | Un instalator sau o firmă de irigații pentru apă, un electrician autorizat pentru curent și iluminat. Nu sunt lucrări de improvizat.',
    'Trebuie acorduri pentru lucrări în grădină? | Poate fi nevoie pentru tăierea unor copaci, pentru modificarea reliefului sau pentru lucrări în zone protejate. Depinde de zonă, deci întreabă la primărie.',
    'Cum compar ofertele? | Pe aceleași criterii: suprafață, pregătirea terenului, plante și materiale, instalații, manoperă și ce se întâmplă cu plantele care nu prind. Un preț global fără listă nu se poate compara.',
    'De ce depinde costul unei amenajări? | De suprafață, de starea terenului, de instalații, de materiale, de plante și de accesul pentru utilaje. Paginile de preț explică factorii, iar o ofertă detaliată completează imaginea.',
  ],
  sinonime: ['gradinarit', 'grădinărit', 'peisagist', 'amenajari exterioare', 'amenajări exterioare', 'spatii verzi', 'spații verzi', 'firma de gradinarit', 'firmă de grădinărit'],
  blocks: [
    node('hero', 'hero', { title: 'Amenajări grădini și peisagistică', subtitle: 'Grădină, curte, gazon, irigații și gard viu: cum planifici lucrarea și cum compari ofertele. Descrie terenul și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Plan pe zone' },
      { label: 'Ordinea', value: 'Structură, sol, plante' },
      { label: 'Instalații', value: 'Instalator și electrician' },
      { label: 'Compari', value: 'Etape, plante, manoperă' },
    ] }),
    node('intro', 'text', { body: para(
      'O grădină bună se vede în fiecare zi, dar se decide la început: cum se scurge apa, unde sunt alei, ce trece pe sub ele și ce plante se potrivesc locului. Rezultatul bun cere ordine în lucrări, nu doar plante frumoase.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Amenajarea grădinii și a curții', text: 'Plan, lucrări de teren, alei, plantări și iluminat, în ordinea care evită refacerile.' },
      { title: 'Gazon și irigații', text: 'Pregătirea solului, rulou sau semănat și un sistem de irigare planificat înainte de gazon.' },
      { title: 'Gard viu', text: 'Alegerea speciei, plantarea și întreținerea, cu atenție la distanțele față de vecini.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Amenajări de grădini pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre amenajări de grădini' }),
    node('prices', 'price_links', { title: 'Prețuri pentru amenajări de grădini' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Vizită și discuție', text: 'Firma vede terenul, întreabă cum folosești grădina și ce întreținere poți face.' },
      { title: 'Plan și ofertă detaliată', text: 'Cere zonele, materialele, plantele, instalațiile, manopera și termenul, separate pe poziții.' },
      { title: 'Contract', text: 'Contract scris, cu etape și condiții de plată. Evită plata integrală în avans.' },
      { title: 'Execuție pe etape', text: 'Lucrări de teren și instalații, alei, apoi sol și plantări, în această ordine.' },
      { title: 'Predare și întreținere', text: 'Primești recomandări de udare și îngrijire și clarifici ce se întâmplă cu plantele care nu prind.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere oferte de la două sau trei firme și compară-le pe aceleași poziții. Cere lucrări mai vechi pe care le poți vedea, pentru că o grădină se judecă în timp, nu în prima lună.',
      'Pentru instalațiile de apă și curent cere ca lucrarea să o facă personal autorizat. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre amenajări de grădini' }),
    node('firms', 'firms_list', { title: 'Firme de amenajări grădini', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei să-ți amenajezi grădina?', text: 'Descrie terenul și ce îți dorești și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
