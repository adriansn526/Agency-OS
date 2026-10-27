import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const microcimentPoliuretan: SituationContent = {
  slug: 'pardoseli-placari--microciment-poliuretan',
  categorie: 'pardoseli-placari',
  title: 'Pardoseli din microciment și poliuretan: aplicare și cost',
  seoTitle: 'Pardoseli microciment și poliuretan: aplicare, cost',
  seoDescription: 'Microciment și poliuretan pe pardoseală: ce sunt, unde se aplică, ordinea straturilor, greșeli frecvente și de ce depinde costul. Compară ofertele.',
  summary: 'Ce sunt pardoselile din microciment și poliuretan, pe ce suport se aplică, în ce ordine se lucrează, de ce depinde costul și cum compari ofertele.',
  sinonime: ['microciment pardoseala', 'pardoseala microciment', 'pardoseli poliuretanice', 'vopsea pardoseala beton'],
  intrebari: [
    'Ce este microcimentul pe pardoseală? | Este un strat subțire, pe bază de ciment și rășini, aplicat peste un suport în mai multe straturi și protejat cu un lac sau un sigilant. Rezultatul este o suprafață continuă, fără rosturi, cu aspect mat sau satinat.',
    'Ce este o pardoseală poliuretanică? | Este un sistem pe bază de poliuretan, aplicat ca strat continuu sau ca strat de protecție. Este mai elastic decât epoxidul și se folosește pentru acoperiri unde contează flexibilitatea și rezistența la lumină.',
    'Se poate aplica microcimentul peste gresie? | Uneori da, cu o pregătire adecvată și cu produse compatibile, dacă gresia este bine fixată. Cere firmei o probă și soluția scrisă, pentru că depinde de sistemul ales.',
    'Se poate folosi o vopsea pentru beton ca pardoseală? | Există vopsele pentru pardoseli din beton, indicate pentru trafic ușor și spații tehnice. Nu au rezistența unui sistem aplicat în straturi. Alege produsul după utilizare și citește fișa tehnică.',
    'Rezistă microcimentul la apă? | Stratul de protecție decide. În băi și în zone umede sunt necesare un sistem declarat pentru asemenea utilizări și o hidroizolație corectă dedesubt. Vezi și pagina despre hidroizolația băii.',
    'Cât costă o pardoseală din microciment? | Depinde de suprafață, de suport, de numărul de straturi, de finisaj și de zona de lucru. Vezi pagina de preț pentru microciment și cere oferte pe lucrări.',
    'Cum se întreține? | Se curăță cu produse recomandate de firma care a aplicat sistemul. Evită substanțele agresive și obiectele care zgârie; stratul de protecție se poate reîmprospăta în timp, conform indicațiilor.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Pardoseli din microciment și poliuretan', subtitle: 'Ce sunt, unde se aplică, în ce ordine se lucrează și de ce depinde costul. Dacă preferi să o facă o firmă, ceri oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Tip de strat', value: 'Continuu, fără rosturi' },
      { label: 'Protecție', value: 'Lac sau sigilant la final' },
      { label: 'Suport', value: 'Beton, șapă, uneori gresie' },
      { label: 'Etapa decisivă', value: 'Pregătirea suportului' },
    ] }),
    node('intro', 'text', { body: para(
      'Microcimentul și poliuretanul sunt două soluții pentru o pardoseală continuă, fără rosturi, cu un aspect modern. Microcimentul este asociat cu un aspect de beton fin; poliuretanul apare ca sistem de pardoseli sau ca strat de protecție. Se discută împreună pentru că aleg aceleași lucruri: un suport sănătos, straturi în ordine și o protecție finală bine făcută.',
      'Pardoseala epoxidică și gresia au propriile pagini, iar aici rămânem la aceste două sisteme.',
    ) }),
    node('where-h', 'heading', { text: 'Unde se aplică', level: 'h2' }),
    node('where', 'cards', { columns: '2', items: [
      { title: 'Living, hol, bucătărie', text: 'Pardoseală continuă în locuință, cu finisaj mat sau satinat, aleasă pentru aspect.' },
      { title: 'Băi și zone umede', text: 'Doar cu sistem declarat pentru asemenea utilizare, cu hidroizolație sub strat și protecție potrivită.' },
      { title: 'Spații comerciale', text: 'Showroomuri, magazine, birouri; se alege sistemul după traficul real.' },
      { title: 'Garaje și spații tehnice', text: 'Vopsea sau sistem poliuretanic pentru betonul expus la trafic; alegerea depinde de solicitare.' },
    ] }),
    node('mat-h', 'heading', { text: 'Soluții și materiale', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Microcimentul se aplică în straturi subțiri, între care se șlefuiesc suprafețele, apoi se sigilează cu un lac sau o rășină de protecție. Poate fi colorat în masă sau cu pigmenți. Poliuretanul se livrează în sisteme cu amorsă, strat de bază și finisaj.',
      'Vopseaua pentru pardoseli din beton este o variantă mai simplă, potrivită unde solicitarea este mică. Nu înlocuiește un sistem complet și se reînnoiește mai des.',
      'Pentru orice produs, ține-te de fișa tehnică: compatibilitatea straturilor, intervalele dintre ele, condițiile de temperatură și umiditate.',
    ) }),
    node('steps', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Evaluarea suportului', text: 'Rezistență, umiditate, fisuri, planeitate. Un suport slab se repară sau se refac înainte de aplicare.' },
      { title: 'Pregătirea suprafeței', text: 'Curățare, șlefuire sau frezare, aspirare; la gresie, pregătirea aderenței conform sistemului.' },
      { title: 'Amorsa', text: 'Strat de legătură între suport și sistem, în produsul recomandat de producător.' },
      { title: 'Straturile sistemului', text: 'Aplicate în ordinea și în intervalele din fișa tehnică; la microciment, cu șlefuire între straturi.' },
      { title: 'Sigilarea', text: 'Stratul de protecție decide rezistența la apă, pete și uzură.' },
      { title: 'Întărirea', text: 'Se respectă timpul înainte de circulație și înainte de așezarea mobilei.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Suport umed sau cu fisuri active', text: 'Fisurile reapar prin strat, iar umiditatea duce la desprindere.' },
      { title: 'Straturi aplicate prea repede', text: 'Intervalele din fișă contează pentru aderență și aspect.' },
      { title: 'Sigilare insuficientă', text: 'Pardoseala se pătează și se uzează, mai ales în bucătărie și baie.' },
      { title: 'Produse necompatibile între ele', text: 'Amorsa, stratul și lacul trebuie să facă parte din același sistem.' },
      { title: 'Folosire în zone umede fără soluție adecvată', text: 'Dușul și zona din jurul căzii cer hidroizolație și sistem declarat pentru asta.' },
      { title: 'Așteptări greșite despre aspect', text: 'Microcimentul este un strat artizanal; nuanțele și urmele de aplicare fac parte din aspect.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de suprafață, de starea și pregătirea suportului, de sistemul ales, de numărul de straturi și de finisaj, de accesul în locuință și de prezența zonelor umede. Microcimentul cere manoperă calificată, deoarece rezultatul depinde de mână.',
      'Pentru repere vezi pagina de preț a microcimentului, apoi cere oferte pe lucrări.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Compară sistemul propus (straturile, amorsa, sigilantul), pregătirea suportului, numărul de straturi și protecția finală. Cere o mostră sau o probă pe o suprafață mică și denumirea sistemului ca să poți citi fișa tehnică. Diferențele mari de preț vin adesea din numărul de straturi și din pregătirea suportului.',
    ) }),
    node('firm-h', 'heading', { text: 'Cum alegi o firmă', level: 'h2' }),
    node('firm', 'text', { body: para(
      'Cere lucrări similare făcute și vezi-le în realitate, nu doar în poze. Aplicatorul trebuie să poată spune ce sistem folosește, de ce și cum se întreține. Aspectul final depinde de execuție, deci o mostră pe suprafața ta spune mai mult decât orice prezentare.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre microciment și poliuretan' }),
    node('prices', 'price_links', { title: 'Prețuri pentru pardoseli' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la pardoseli și placări' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie spațiul și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
