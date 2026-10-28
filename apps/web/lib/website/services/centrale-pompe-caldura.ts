import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "centrale termice și pompe de căldură": it presents the situations (gas boiler installation, service, air-water heat pump)
 * and sends to the guides and price pages (blocks that fill themselves with what is published). It has no price table of its own.
 */
export const centralePompeCaldura: ServiceContent = {
  slug: 'centrale-pompe-caldura',
  hub: true,
  seoTitle: 'Centrale termice și pompe de căldură: alegere și firme',
  seoDescription: 'Centrale termice și pompe de căldură pentru casă: montaj, revizie, reparații și pompe aer-apă. Cum alegi, cum compari ofertele și cum găsești firme verificate.',
  summary: 'Montaj și schimbare de centrală, revizie și reparații, pompă de căldură aer-apă: cine le face, cum alegi și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Ce diferență este între o centrală și o pompă de căldură? | Centrala produce căldură arzând un combustibil, de exemplu gaz. Pompa de căldură mută căldura din aer sau din alt mediu, folosind energie electrică. Alegerea depinde de casă, de instalație, de combustibilul disponibil și de buget; un instalator te poate ajuta după o vizită.',
    'Cine montează o centrală sau o pompă de căldură? | O firmă de instalații cu personal calificat. La centralele pe gaz, montajul, racordarea și punerea în funcțiune le face personal autorizat, iar cerințele se verifică la distribuitor. Partea electrică o face un electrician autorizat.',
    'Cât de des trebuie verificată o centrală? | Depinde de aparat, de recomandările producătorului și de cerințele aplicabile locuinței tale. Verifică în cartea tehnică și întreabă firma de service sau distribuitorul. Detaliile sunt în pagina despre revizie.',
    'Cum aleg între mai multe oferte? | Compară aparatele, lucrările incluse, documentele, punerea în funcțiune și garanția pentru manoperă. Cere oferte scrise cu același conținut. O ofertă mult mai mică omite de regulă ceva important.',
    'Pot face singur montajul? | La aparatele pe gaz, nu: partea de gaz, evacuarea și ventilarea cer personal autorizat din motive de siguranță. La pompa de căldură, partea frigorifică și cea electrică cer, de asemenea, personal calificat.',
    'De ce depinde costul? | De tipul de aparat, de instalația existentă, de lucrările la coș, evacuare și racorduri, de alimentarea electrică la pompa de căldură și de acces. Paginile de prețuri de mai jos explică factorii.',
  ],
  sinonime: ['centrale termice', 'centrale si pompe de caldura', 'surse de caldura', 'centrale și pompe de căldură', 'surse de căldură'],
  blocks: [
    node('hero', 'hero', { title: 'Centrale termice și pompe de căldură', subtitle: 'Montaj, revizie, reparații și pompe aer-apă: cine le face, cum alegi și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine lucrează', value: 'Personal calificat și autorizat' },
      { label: 'Gazul', value: 'Se verifică la distribuitor' },
      { label: 'Compari', value: 'Aparate, lucrări, documente, garanție' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'Centrala termică sau pompa de căldură este inima instalației de încălzire. Alegerea și montajul se fac cu atenție, pentru că aparatul lucrează ani de zile, iar părți ale lucrării (gaz, evacuare, electric) cer personal autorizat.',
      'Pagina te ajută să identifici situația ta și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Montaj centrală termică pe gaz', text: 'Cine o montează, ce diferență este între montaj și schimbare și ce se verifică la distribuitor.' },
      { title: 'Revizie, verificare și reparații', text: 'Ce include o vizită de service, cine o face și cum compari ofertele.' },
      { title: 'Pompă de căldură aer-apă', text: 'Ce este, ce trebuie să aibă casa, cine o instalează și de ce depinde costul.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Centrale și pompe de căldură pe situații' }),
    node('prices', 'price_links', { title: 'Prețuri pentru centrale termice' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre centrale și pompe de căldură' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Vizită și evaluare', text: 'Firma vede locuința, instalația existentă și nevoile tale și propune soluția.' },
      { title: 'Ofertă detaliată', text: 'Cere aparatul exact, lucrările incluse, formalitățile preluate de firmă, termenul și garanția.' },
      { title: 'Contract și avans', text: 'Contract scris cu garanția pentru manoperă. Evită plata integrală în avans.' },
      { title: 'Execuție', text: 'Montajul și racordurile; partea de gaz, evacuare și electric este făcută de personal autorizat.' },
      { title: 'Punere în funcțiune și recepție', text: 'Probă de funcționare, explicații despre folosire și primirea documentelor și a garanției scrise.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: aparat, lucrări incluse, documente, punere în funcțiune și garanție. O ofertă mult mai mică omite de obicei un pas important.',
      'Întreabă dacă firma are personal autorizat pentru părțile care cer autorizare și ce service oferă ulterior. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre centrale și pompe de căldură' }),
    node('firms', 'firms_list', { title: 'Firme de centrale și pompe de căldură', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie locuința și lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
