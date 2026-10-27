import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "piscine, saune și spa": it presents the situations and sends to the guides and price pages (blocks that fill themselves
 * with what is published). No price table of its own: prices live in the dedicated price pages.
 */
export const piscineSaune: ServiceContent = {
  slug: 'piscine-saune',
  hub: true,
  seoTitle: 'Piscine, saune și spa: situații și firme verificate',
  seoDescription: 'Construire piscină, încălzire și întreținere, saună, jacuzzi și baie de aburi: ce soluții există, ce întrebi și cum compari ofertele. Ghiduri și firme verificate.',
  summary: 'Construirea unei piscine, încălzirea și întreținerea ei, saună, jacuzzi și baie de aburi: ce soluții există și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Ce lucrări acoperă această categorie? | Construirea piscinelor din beton sau prefabricate, încălzirea, filtrarea și întreținerea lor, precum și montajul de saune, jacuzzi și băi de aburi. Nu ne ocupăm de piscine gonflabile sau de vânzarea de produse, ci de lucrările executate de firme.',
    'Am nevoie de autorizație pentru o piscină sau o saună exterioară? | Depinde de tip, de dimensiune, de amplasare și de regulile locale. Nu există un răspuns valabil peste tot: întreabă la primăria din localitate ce acte sunt necesare pentru cazul tău, înainte de a comanda sau de a începe lucrarea.',
    'Cine face instalația electrică la o piscină sau la o saună? | Un electrician autorizat. Apa și curentul electric împreună cer protecții speciale, iar o saună are un consum ridicat. Lucrarea nu se improvizează, iar soluția exactă o stabilește specialistul.',
    'Cum compar ofertele pentru o piscină? | Pe conținut: soluția structurală, etanșarea, echipamentele de circulare și filtrare, finisajele, lucrările de racordare și ce rămâne în sarcina ta. O ofertă fără aceste detalii nu se poate compara cu alta.',
    'Ce costuri apar după construire? | Încălzirea apei, energia pentru pompe, tratamentul apei, curățarea și iernarea. Ele depind de mărimea piscinei și de modul de folosire. Întreabă firma ce ți-ar costa funcționarea, nu doar construcția.',
    'Merită o saună sau un jacuzzi în casă? | Depinde de spațiul disponibil, de instalația electrică, de ventilație și de cât le vei folosi. Un specialist poate evalua dacă locul ales este potrivit înainte de comandă.',
    'Ce garanție ar trebui să ofere firma? | Cere garanția pentru manoperă și documentele echipamentelor în scris. La piscine, cere și clarificarea modului în care se rezolvă o pierdere de apă apărută după umplere.',
  ],
  sinonime: ['piscine', 'piscină', 'spa', 'wellness', 'piscine si saune', 'piscine și saune'],
  blocks: [
    node('hero', 'hero', { title: 'Piscine, saune și spa', subtitle: 'Construire, încălzire, întreținere, saună, jacuzzi și baie de aburi: ce soluții există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Teren, spațiu și instalații' },
      { label: 'Acte', value: 'Întreabă la primărie' },
      { label: 'Electricitate', value: 'Electrician autorizat' },
      { label: 'Compari', value: 'Structură, echipamente, finisaj' },
    ] }),
    node('intro', 'text', { body: para(
      'Piscinele, saunele și jacuzzi-urile par proiecte de relaxare, dar sunt de fapt lucrări de construcții și de instalații: pământ, beton, apă, curent electric și ventilație. De aceea merită abordate cu un specialist, mai ales înainte de a comanda ceva.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Construire piscină', text: 'Din beton sau prefabricată, în curte sau în casă: teren, structură, etanșare și instalații, plus ce întrebi la primărie.' },
      { title: 'Încălzire și întreținere', text: 'Pompă de căldură, încălzitor, filtrare, curățare și iernare, cu diferențele dintre soluții.' },
      { title: 'Saună, jacuzzi și baie de aburi', text: 'Tipuri, cerințe de instalare, ventilație și siguranță, plus ce compari în ofertele de montaj.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Piscine, saune și spa pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre piscine și saune' }),
    node('prices', 'price_links', { title: 'Prețuri pentru piscine și lucrări speciale' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Idee și loc', text: 'Stabilești ce vrei și unde, ținând cont de teren, de acces și de instalațiile disponibile.' },
      { title: 'Acte și proiect', text: 'Întrebi la primărie ce acte cere cazul tău și, unde e nevoie, se face un proiect.' },
      { title: 'Ofertă detaliată', text: 'Cere structura, echipamentele, finisajele și racordurile descrise separat, plus termenul și garanția.' },
      { title: 'Execuție', text: 'Lucrările de teren, structură, instalații și finisaje, cu partea electrică făcută de personal autorizat.' },
      { title: 'Probă și recepție', text: 'Se verifică funcționarea, etanșeitatea și siguranța, iar tu primești garanția scrisă și instrucțiunile de folosire.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: soluția, materialele, echipamentele, lucrările incluse, termenul și garanția. O ofertă mult mai mică lasă de obicei deoparte un pas important, cum ar fi etanșarea, ventilația sau partea electrică.',
      'Întreabă ce lucrări similare a făcut firma și cere, dacă se poate, referințe. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre piscine, saune și spa' }),
    node('firms', 'firms_list', { title: 'Firme pentru piscine, saune și spa', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte pentru lucrarea ta?', text: 'Descrie ce vrei să construiești sau să montezi și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
