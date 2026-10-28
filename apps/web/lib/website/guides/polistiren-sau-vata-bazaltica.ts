import { node, para, type GuideContent } from './types'

export const polistirenSauVataBazaltica: GuideContent = {
  slug: 'polistiren-sau-vata-bazaltica',
  serviciu: 'izolatii-termice',
  title: 'Polistiren sau vată bazaltică: cum alegi',
  seoTitle: 'Polistiren sau vată bazaltică: cum alegi',
  seoDescription: 'Diferențele dintre polistiren (inclusiv grafitat) și vată minerală bazaltică: comportarea la foc și la umezeală, unde se potrivesc și ce întrebi montatorul.',
  summary: 'Ce diferențe sunt între polistiren și vata bazaltică, unde se potrivește fiecare, cum alegi și ce să întrebi echipa care montează.',
  keyword: 'vata bazaltica',
  keywords: ['vata bazaltica', 'vată bazaltică', 'vata minerala', 'vată minerală', 'vata minerala bazaltica', 'vată minerală bazaltică', 'polistiren grafitat', 'pret vata bazaltica', 'vata bazaltica pret', 'vata bazaltica rockwool', 'preț vată bazaltică', 'vată bazaltică preț', 'vată bazaltică rockwool'],
  intrebari: [
    'Ce este vata bazaltică? | O vată minerală obținută din rocă bazaltică topită și transformată în fibre, livrată în plăci, saltele sau rulouri. Se folosește la izolarea termică și fonică a fațadelor, acoperișurilor și pereților.',
    'Ce este polistirenul grafitat? | Un polistiren cu adaos de grafit, care îi schimbă aspectul (de obicei gri) și proprietățile izolante față de cel alb. Compară valorile din fișele tehnice ale produselor concrete, nu doar culoarea.',
    'Care se comportă mai bine la foc? | Vata minerală este, în general, materialul necombustibil, iar polistirenul este combustibil și se tratează cu aditivi. Cerințele depind de clădire și de proiect; întreabă proiectantul sau firma ce clasă de reacție la foc se cere la tine.',
    'Care lasă peretele să respire? | Vata minerală este mai permeabilă la vapori decât polistirenul. Contează la pereți care trebuie să elimine umezeala; la alții nu este factorul principal. Alegerea se discută cu proiectantul sau cu firma.',
    'Care este mai ușor de montat? | Polistirenul este ușor și se taie și manevrează rapid. Vata este mai grea și mai pretențioasă la tăiere și la protecția față de umezeală în timpul lucrului. Montajul corect, indiferent de material, contează mai mult decât materialul.',
    'Care este mai ieftin? | Depinde de produs, de grosime și de piață. Nu compara doar prețul pe metru pătrat, ci și sistemul întreg: adezivi, dibluri, armare și manoperă. Cere ofertă pe aceleași specificații pentru ambele variante.',
    'Ce întreb montatorul? | Ce produs propune, ce grosime și de ce, ce fișă tehnică are, cum fixează plăcile, cum tratează soclul și golurile și ce garanție oferă. Răspunsurile clare arată experiență.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Polistiren sau vată bazaltică: cum alegi', subtitle: 'Diferențele dintre cele două materiale, unde se potrivește fiecare și ce întrebi montatorul. Dacă ai nevoie de o firmă, ceri oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Polistiren', value: 'Ușor, rapid de montat' },
      { label: 'Vată bazaltică', value: 'Necombustibilă, mai permeabilă' },
      { label: 'Decide', value: 'Locul, proiectul, cerințele' },
      { label: 'Compari', value: 'Sistemul, nu doar placa' },
    ] }),
    node('intro', 'text', { body: para(
      'Polistirenul și vata minerală bazaltică sunt cele mai căutate materiale pentru izolarea termică. Nu există un „câștigător” general: alegerea depinde de locul în care se aplică, de cerințele clădirii și de felul în care se execută lucrarea.',
      'Ghidul explică diferențele pe care merită să le cunoști ca să discuți informat cu proiectantul sau cu firma. Pașii lucrării sunt pe paginile de situație din categorie.',
    ) }),
    node('diff-h', 'heading', { text: 'Diferențele principale', level: 'h2' }),
    node('diff', 'cards', { columns: '2', items: [
      { title: 'Comportarea la foc', text: 'Vata minerală este în general necombustibilă; polistirenul este combustibil. Cerințele de proiect pot impune una dintre ele.' },
      { title: 'Permeabilitatea la vapori', text: 'Vata lasă umezeala să treacă mai ușor, polistirenul mai greu. Contează la pereții care trebuie să elimine umezeala.' },
      { title: 'Manevrare și montaj', text: 'Polistirenul este ușor și se taie rapid; vata este mai grea și cere protecție la umezeală în timpul lucrului.' },
      { title: 'Rezistența la umezeală', text: 'Polistirenul se comportă bine la umiditate, în timp ce vata își pierde din performanță dacă se udă și rămâne udă. De aceea protecția în timpul lucrului este importantă.' },
      { title: 'Polistiren alb și grafitat', text: 'Cel grafitat are altă compoziție și altă culoare; compară valorile din fișele tehnice, nu doar numele.' },
      { title: 'Zgomot', text: 'Vata ajută de obicei mai mult la izolarea fonică decât polistirenul.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Pornește de la cerințele clădirii: înălțime, destinație, cerințe de siguranță la foc și tipul de perete. Dacă proiectul sau un specialist cere un anumit material, urmezi proiectul. Dacă ai libertate, discută cu firma avantajele fiecăruia pentru casa ta.',
      'Evită să alegi doar după preț sau după numele unui producător. Un material bun, montat prost, dă un rezultat prost; unul obișnuit, montat corect cu sistemul potrivit, funcționează bine.',
    ) }),
    node('ask-h', 'heading', { text: 'Ce întrebi un meșter', level: 'h2' }),
    node('ask', 'steps', { title: 'Întrebări utile', items: [
      { title: 'Ce produs propui și de ce?', text: 'Să poată explica alegerea pentru casa ta, nu doar să recomande ce folosește de obicei.' },
      { title: 'Ce fișă tehnică are produsul?', text: 'Cere documentele produsului și verifică dacă datele corespund cu oferta.' },
      { title: 'Cum fixezi și cum închei detaliile?', text: 'Dibluire, soclu, colțuri și goluri: aici se văd diferențele între echipe.' },
      { title: 'Ce garanție dai și ce acoperă?', text: 'Garanția pentru manoperă, în scris, cu condițiile clare.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul unei izolații nu se reduce la placă. Contează grosimea, produsul, componentele sistemului (adeziv, dibluri, armare, finisaj), suprafața, accesul și manopera. Cere oferte pentru ambele variante, cu aceleași specificații, ca să le poți compara.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente' }),
    node('prices', 'price_links', { title: 'Prețuri pentru izolații termice' }),
    node('guides', 'guide_links', { title: 'Alte ghiduri despre izolații termice' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de o ofertă pentru izolație?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
