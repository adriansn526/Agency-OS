import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "climatizare": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages, so the page does not compete with them.
 */
export const climatizare: ServiceContent = {
  slug: 'climatizare',
  hub: true,
  seoTitle: 'Climatizare: situații, soluții și firme verificate',
  seoDescription: 'Montaj aer condiționat, igienizare, service, ventilație și pompă de căldură: de ce depinde costul și cum alegi instalatorul. Firme verificate.',
  summary: 'Montaj, igienizare și service pentru aer condiționat, ventilație cu recuperare sau pompă de căldură: ce include lucrarea, de ce depinde costul și cum compari ofertele.',
  preturi: [],
  intrebari: [
    'Ce lucrări de climatizare există? | Montaj de aparate, igienizare, service și reparații, ventilație cu recuperare de căldură și pompe de căldură aer-aer. Ghidurile de mai jos explică fiecare situație și ce să compari în oferte.',
    'De ce depinde costul unui montaj de aer condiționat? | Depinde de tipul aparatului, de lungimea traseului dintre unități, de etaj și accesul la fațadă, de felul peretelui și de finisajele de refăcut. Cere un deviz care enumeră ce include prețul și consultă paginile de prețuri de mai jos.',
    'Am nevoie de acord ca să montez un aparat în bloc? | Unitatea exterioară se montează de obicei pe o zonă comună, deci regulile depind de asociația de proprietari și de cum e fațada. Întreabă asociația și, dacă e cazul, primăria, înainte de montaj.',
    'Poate montajul să fie făcut de oricine? | Garanția producătorului depinde de un montaj corect, iar lucrul cu agenți frigorifici cere personal pregătit pentru asta. Alege o firmă care lucrează cu tehnicieni calificați și cere factură, garanție pentru montaj și fișa de punere în funcțiune.',
    'Cât de des trebuie făcut service-ul la aerul condiționat? | Recomandarea producătorului din manualul aparatului este cea de urmat; în general se face o verificare înainte de sezonul în care folosești mai mult aparatul. Filtrele se curăță mai des, conform instrucțiunilor.',
    'De ce nu răcește aparatul? | Cauzele frecvente sunt filtrele înfundate, o pierdere de agent frigorific, unitatea exterioară blocată sau un aparat nepotrivit camerei. Cauza exactă o stabilește un tehnician prin diagnoză, iar paginile de prețuri explică ce influențează costul.',
    'Ce aparat se potrivește camerei mele? | Depinde de volumul și expunerea camerei, de cât timp îl folosești și dacă vrei și încălzire. Un instalator care vede locul poate recomanda soluția potrivită; nu alege doar după suprafață.',
  ],
  sinonime: ['climatizare', 'aer condiționat', 'instalator climatizare', 'instalații climatizare', 'firmă climatizare'],
  blocks: [
    node('hero', 'hero', { title: 'Climatizare', subtitle: 'Montaj aer condiționat, igienizare, service, ventilație sau pompă de căldură: ce soluții există și cum compari ofertele. Primești oferte de la instalatori verificați din zona ta.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații', 'Firme verificate'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Alegerea aparatului și a locului' },
      { label: 'Compari', value: 'Ce include devizul' },
      { label: 'Service', value: 'Verificare periodică' },
      { label: 'În bloc', value: 'Cere acordul asociației' },
    ] }),
    node('intro', 'text', { body: para(
      'Un aparat bun montat prost funcționează slab și se strică devreme. Jumătate din rezultat vine din instalare: traseul conductelor, verificarea circuitului, scurgerea condensului și amplasarea unităților.',
      'Pagina aceasta te ajută să identifici situația și te trimite la ghidul potrivit. La final poți cere oferte gratuite de la instalatori verificați din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Montaj aer condiționat', text: 'Ce include montajul, cum se alege locul unităților și ce compari în ofertele firmelor.' },
      { title: 'Curățare și igienizare', text: 'Ce poți face singur, când chemi o firmă și ce intră într-o igienizare completă.' },
      { title: 'Reparații și service', text: 'Defecte frecvente, diagnosticul și încărcarea cu agent frigorific, acolo unde este cazul.' },
      { title: 'Ventilație cu recuperare', text: 'Aer proaspăt cu pierderi mici de căldură; ghidul explică tipurile de sisteme și ce implică montajul.' },
      { title: 'Pompă de căldură aer-aer', text: 'Când se potrivește, ce presupune montajul și cum compari ofertele.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Climatizare pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre climatizare' }),
    node('prices', 'price_links', { title: 'Prețuri pentru climatizare' }),
    node('steps', 'steps', { title: 'Cum decurge o lucrare cu o firmă', items: [
      { title: 'Alegerea soluției și a locului', text: 'Aparatul se alege după camera în care îl pui și după cum îl folosești. Locul unităților se stabilește la vizită.' },
      { title: 'Vizită și ofertă', text: 'Tehnicianul vede traseul. Oferta spune ce include prețul, cine face găurirea și cine reface finisajele.' },
      { title: 'Contract și avans', text: 'Cere acord scris pentru ce s-a stabilit și evită plata integrală în avans.' },
      { title: 'Execuție și punere în funcțiune', text: 'Montajul, verificarea circuitului și probele de funcționare se fac înainte de predare.' },
      { title: 'Predare și garanție', text: 'Primești factura, fișa de punere în funcțiune și explicații pentru utilizare și întreținere.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi instalatorul', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere un deviz care enumeră ce include prețul: conductele, consola de fixare, găurirea, scurgerea condensului, alimentarea electrică și punerea în funcțiune. Un preț mic fără aceste detalii se poate transforma în suplimente la montaj.',
      'Verifică dacă tehnicienii sunt pregătiți pentru lucrul cu agenți frigorifici și dacă firma dă factură și garanție pentru montaj, nu doar pentru aparat. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre climatizare' }),
    node('firms', 'firms_list', { title: 'Firme de climatizare', limit: '6' }),
    node('request-cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
