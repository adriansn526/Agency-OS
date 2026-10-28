import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const panouriSolareApaCalda: SituationContent = {
  slug: 'fotovoltaice-energie-regenerabila--panouri-solare-apa-calda',
  categorie: 'fotovoltaice-energie-regenerabila',
  title: 'Panouri solare pentru apă caldă',
  seoTitle: 'Panouri solare pentru apă caldă: alegere și montaj',
  seoDescription: 'Cum funcționează panourile solare termice pentru apă caldă, diferența dintre sistemele presurizate și nepresurizate, ce intră în ofertă și cum alegi instalatorul.',
  summary: 'Cum funcționează panourile solare pentru apă caldă, ce diferențe sunt între sistemele presurizate și nepresurizate și ce să compari în ofertele instalatorilor.',
  sinonime: [
    'panouri solare', 'panou solar', 'panou solar apa calda', 'panouri solare apa calda', 'panou solar presurizat', 'panouri solare presurizate', 'panouri solare nepresurizate', 'panou solar nepresurizat', 'boiler solar presurizat',
    'panou solar apă caldă', 'panouri solare apă caldă',
  ],
  intrebari: [
    'Care este diferența dintre panourile solare și cele fotovoltaice? | Panourile solare termice încălzesc un lichid și, prin el, apa caldă menajeră. Cele fotovoltaice produc curent electric. Sunt lucrări diferite, cu instalatori și componente diferite; pe cele fotovoltaice le găsești la pagina lor.',
    'Ce înseamnă sistem presurizat și nepresurizat? | Într-un sistem presurizat, circuitul panourilor funcționează sub presiune, cu pompă și automatizare, iar boilerul poate fi în casă. Un sistem nepresurizat, mai simplu, funcționează gravitațional sau cu presiunea apei din rețea și, de obicei, are rezervorul în apropierea panoului. Alegerea depinde de casă, de nevoia de apă caldă și de climă.',
    'Cine montează panouri solare pentru apă caldă? | O firmă de instalații termice sau sanitare, cu personal care lucrează la înălțime pe acoperiș. Racordarea la instalația de apă și, la sistemele cu pompă, la curent trebuie făcută de personal calificat.',
    'Funcționează iarna? | Panourile produc și pe vreme rece dacă bat razele soarelui, dar cantitatea de apă caldă scade. De aceea sistemul se completează de obicei cu o altă sursă de încălzire a apei, iar sistemele cu lichid special sunt gândite să reziste la îngheț.',
    'Ce intră într-o ofertă? | Panourile, structura de prindere, boilerul sau rezervorul, conductele izolate, pompa și automatizarea la sistemele presurizate, vasul de expansiune, manopera și punerea în funcțiune. Cere lista modelelor și ce rămâne în sarcina ta.',
    'Mai pot adăuga o sursă de încălzire a apei? | De regulă da. Boilerul poate avea o rezistență electrică sau o serpentină racordată la centrala termică, pentru zilele cu soare puțin. Firma stabilește ce variantă se potrivește instalației tale.',
    'De ce depinde costul? | De tipul sistemului (presurizat sau nu), de numărul de persoane și nevoia de apă caldă, de volumul boilerului, de tipul acoperișului, de lungimea conductelor și de racordarea la instalația existentă. Pentru un ordin de mărime, vezi paginile de preț.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Panouri solare pentru apă caldă: alegere și montaj', subtitle: 'Cum funcționează, ce diferență e între sistemele presurizate și nepresurizate și ce întrebi instalatorul. Descrie casa și primești oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Ce face', value: 'Încălzește apa menajeră' },
      { label: 'Tipuri', value: 'Presurizat sau nepresurizat' },
      { label: 'Cine montează', value: 'Instalator termic, la înălțime' },
      { label: 'Completare', value: 'O a doua sursă de încălzire' },
    ] }),
    node('intro', 'text', { body: para(
      'Panourile solare termice captează căldura soarelui și o folosesc pentru a încălzi apa din casă. Nu produc curent electric, deci nu se confundă cu panourile fotovoltaice. Căutările sunt adesea de produs, dar rezultatul depinde de alegerea tipului de sistem și de modul în care este integrat în instalația casei.',
      'Pagina te ajută să înțelegi cum lucrează sistemele, ce diferențe au și ce să compari între oferte. La final poți cere oferte gratuite de la instalatori verificați din zona ta.',
    ) }),
    node('what-h', 'heading', { text: 'Presurizat sau nepresurizat', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Sistem presurizat', text: 'Circuit închis, cu pompă, vas de expansiune și automatizare. Boilerul se poate afla în casă, iar instalația este mai flexibilă, dar și mai complexă.' },
      { title: 'Sistem nepresurizat', text: 'Soluție mai simplă, cu rezervorul în apropierea panoului, fără pompă la multe modele. Se potrivește situațiilor cu cerințe mai modeste, dar are limite de amplasare.' },
      { title: 'Boilerul solar', text: 'Rezervorul în care se păstrează apa caldă. Poate avea o sursă suplimentară de încălzire pentru zilele fără soare.' },
      { title: 'Conducte și izolație', text: 'Legăturile dintre panouri și boiler. Izolația lor contează pentru pierderile de căldură.' },
    ] }),
    node('where-h', 'heading', { text: 'Cum alegi sistemul', level: 'h2' }),
    node('where', 'text', { body: para(
      'Pornește de la câte persoane locuiesc în casă, cum se folosește apa caldă, unde se poate monta rezervorul și ce orientare are acoperișul. Instalatorul ar trebui să vadă locul înainte de ofertă și să explice de ce propune un tip sau altul.',
      'Pentru încălzirea casei sau pentru curent electric, alte soluții sunt mai potrivite, iar pentru ele găsești paginile dedicate din această categorie.',
    ) }),
    node('steps-h', 'steps', { title: 'Ordinea lucrării', items: [
      { title: 'Vizită și alegerea sistemului', text: 'Se vede acoperișul, locul boilerului și instalația existentă, apoi se alege tipul de sistem.' },
      { title: 'Verificarea acoperișului', text: 'Se verifică învelitoarea și prinderea; dacă sunt reparații, se fac înainte de montaj.' },
      { title: 'Montajul panourilor', text: 'Structura se prinde de acoperiș, iar panourile se montează de personal care lucrează la înălțime cu protecții.' },
      { title: 'Conducte, boiler și automatizare', text: 'Se leagă panourile de boiler, se izolează conductele și se montează pompa și comanda, unde sistemul le cere.' },
      { title: 'Umplere, probe și predare', text: 'Se umple circuitul, se verifică etanșeitatea și funcționarea și se predau instrucțiunile și garanțiile.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Confuzia cu panourile fotovoltaice', text: 'Cele solare termice dau apă caldă, nu curent. Decide ce nevoie ai înainte de a cere ofertă.' },
      { title: 'Alegerea fără vizită', text: 'Un sistem ales după fotografii poate să nu se potrivească acoperișului sau instalației.' },
      { title: 'Izolație slabă la conducte', text: 'Căldura se pierde pe drum, iar sistemul își pierde sensul.' },
      { title: 'Lipsa unei surse de rezervă', text: 'Pe vreme cu soare puțin, fără completare nu ai apă caldă suficientă.' },
      { title: 'Ignorarea înghețului', text: 'Sistemul trebuie gândit pentru temperaturile din zona ta.' },
      { title: 'Lucru la înălțime fără protecții', text: 'Montajul pe acoperiș se face doar de echipe instruite și echipate.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de tipul sistemului, de volumul de apă caldă de care ai nevoie, de calitatea panourilor și a boilerului, de tipul acoperișului, de lungimea conductelor și de racordarea la instalația existentă. Pentru sistemele presurizate se adaugă pompa și automatizarea.',
      'Cere oferte care numesc modelele exacte și care separă materialele de manoperă. Pentru un ordin de mărime, vezi paginile de preț de mai jos.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Compară tipul de sistem, numărul și tipul panourilor, volumul boilerului, ce izolație au conductele, dacă pompa și automatizarea sunt incluse, termenul și garanția. Întreabă ce se întâmplă iarna și cum se completează încălzirea apei.',
      'Nu accepta promisiuni de economii fără o analiză a consumului tău de apă caldă.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Caută o firmă de instalații care a mai montat sisteme solare termice și poate arăta lucrări. Cere contract scris, garanție pentru montaj și pentru produse și instrucțiuni de folosire la predare.',
      'Pentru racordurile la apă și canalizare, vezi și paginile despre instalații sanitare. Pentru acoperiș, vezi pagina despre învelitoare.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre panouri solare pentru apă caldă' }),
    node('prices', 'price_links', { title: 'Prețuri pentru instalații și energie solară' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la fotovoltaice și energie regenerabilă' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie casa și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
