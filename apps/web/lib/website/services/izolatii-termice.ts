import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "izolații termice": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const izolatiiTermice: ServiceContent = {
  slug: 'izolatii-termice',
  hub: true,
  seoTitle: 'Izolații termice: fațadă, pod, pereți și firme',
  seoDescription: 'Izolații termice pentru casă: fațadă, pod și pereți pe interior. Ce soluții există, cum alegi materialul și cum compari ofertele. Firme verificate.',
  summary: 'Fațadă, pod sau pereți pe interior: ce soluții de izolare termică există, cum le alegi și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Ce este izolația termică? | Un strat sau un sistem care reduce pierderile de căldură iarna și încălzirea excesivă vara, prin pereți, pod sau planșee. Rezultatul se vede în confort și în consumul de energie, dar depinde de cum este executată lucrarea, nu doar de material.',
    'Unde se izolează o casă mai întâi? | Depinde de unde se pierde căldura și de ce poți modifica. De multe ori se pornește de la pod și de la fațadă. Un specialist sau o firmă îți poate indica prioritățile după ce vede casa.',
    'Ce materiale se folosesc? | Cele mai frecvente sunt polistirenul, vata minerală și spuma poliuretanică. Fiecare are avantaje și limite, iar alegerea depinde de locul în care se aplică. Ghidul de mai jos compară cele două materiale cel mai des folosite pe fațadă.',
    'Pot izola singur casa? | Pe suprafețe mici și accesibile, urmând fișele tehnice, uneori da. Fațadele, spuma poliuretanică și pereții cu probleme de umezeală cer echipe cu experiență: erorile se văd greu și se repară scump.',
    'Cât costă o izolație? | Depinde de suprafață, de soluția aleasă, de înălțimea și accesul la lucrare, de starea suportului și de finisaje. Compară ofertele pe conținut: produsul, grosimea, detaliile și garanția. Paginile de prețuri de mai jos explică factorii.',
    'Ce garanție ar trebui să ofere firma? | Cere în scris garanția pentru manoperă, produsele folosite și, dacă există, fișele tehnice. Fotografiile din etapele lucrării sunt o dovadă utilă dacă apar probleme.',
  ],
  sinonime: ['izolatii termice', 'izolații termice', 'izolații termice casă', 'izolatii termice si fatade', 'reabilitare termică', 'izolare termică casă'],
  blocks: [
    node('hero', 'hero', { title: 'Izolații termice', subtitle: 'Fațadă, pod sau pereți pe interior: ce soluții există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Vezi unde se pierde căldura' },
      { label: 'Ce alegi', value: 'Materialul potrivit locului' },
      { label: 'Compari', value: 'Produs, grosime, detalii' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'O izolație bine făcută se simte în confort și în facturile de încălzire. Una făcută prost poate duce la condens, mucegai sau desprinderi. Rezultatul depinde de alegerea soluției pentru locul respectiv și de execuția detaliilor.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Izolația fațadei', text: 'Termosistem pe exteriorul casei, cu plăci izolante, strat armat și finisaj. Contează soclul, dibluirea și detaliile la ferestre.' },
      { title: 'Izolația podului', text: 'Spumă poliuretanică, vată sau polistiren, în funcție de acces și de cum este folosit podul. Se verifică mai întâi acoperișul.' },
      { title: 'Izolația pereților pe interior', text: 'Soluție când exteriorul nu se poate izola. Cere atenție la condens și la punțile termice.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Izolații termice pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre izolații termice' }),
    node('prices', 'price_links', { title: 'Prețuri pentru izolații termice' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Vizită și evaluare', text: 'Firma vede casa, verifică starea suportului și propune soluția. Oferta trebuie să pornească de aici.' },
      { title: 'Ofertă detaliată', text: 'Cere produsele exacte, grosimea, detaliile incluse, termenul și garanția. Compară oferte cu același conținut.' },
      { title: 'Contract și avans', text: 'Contract scris cu garanția pentru manoperă. Evită plata integrală în avans.' },
      { title: 'Execuție', text: 'Pregătirea suportului, montajul izolației și finisajele, cu fotografii din etapele care se acoperă.' },
      { title: 'Recepție', text: 'Verifici lucrarea împreună cu echipa și primești fișele produselor și garanția scrisă.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: produsul și grosimea, pregătirea suportului, detaliile de la soclu, goluri și racorduri, termenul și garanția. O ofertă mult mai mică lasă de obicei deoparte un pas important.',
      'Întreabă ce lucrări similare a făcut firma și cere, dacă se poate, referințe. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre izolații termice' }),
    node('firms', 'firms_list', { title: 'Firme de izolații termice', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte pentru izolarea casei?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
