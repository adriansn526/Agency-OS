import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const montajParchet: SituationContent = {
  slug: 'pardoseli-placari--montaj-parchet',
  categorie: 'pardoseli-placari',
  title: 'Montaj parchet: laminat, SPC, click și manoperă',
  seoTitle: 'Montaj parchet laminat și SPC: ordine și manoperă',
  seoDescription: 'Montaj parchet laminat sau SPC cu sistem click: pregătirea suportului, ordinea lucrării, greșeli frecvente și de ce depinde manopera. Compară ofertele.',
  summary: 'Cum se montează parchetul laminat sau SPC cu sistem click, ce trebuie pregătit, în ce ordine se lucrează, de ce depinde manopera și cum compari ofertele.',
  sinonime: ['montaj parchet', 'montaj parchet laminat', 'pret montaj parchet laminat', 'manopera parchet laminat', 'montaj parchet spc', 'montare parchet spc', 'montare parchet cu click', 'pret montaj parchet', 'renovare parchet'],
  intrebari: [
    'Ce se montează cel mai des cu sistem click? | Parchetul laminat și plăcile SPC se livrează de obicei cu îmbinare click, care se închide fără adeziv și se așază flotant, adică nelipit de suport. Parchetul masiv sau triplustratificat poate fi lipit sau fixat, în funcție de produs.',
    'Ce suport trebuie să am înainte de montaj? | O șapă uscată, plană, curată și solidă. Neregularitățile mari se corectează înainte, cu autonivelant sau reparații, iar la șapele noi trebuie respectat timpul de uscare și verificată umiditatea.',
    'Este nevoie de folie și de substrat? | De regulă da: folie contra umidității (la parter, deasupra spațiilor umede sau pe șapă nouă) și un substrat sub parchet. Tipul și compatibilitatea sunt în indicațiile producătorului; unele plăci SPC au substratul integrat.',
    'De ce se lasă un rost de dilatare la pereți? | Parchetul flotant se dilată și se contractă cu temperatura și umiditatea. Dacă este blocat de pereți, se ridică sau se desface. Rostul se acoperă ulterior cu plinta. Dimensiunea o dă fișa producătorului.',
    'Se poate monta parchet peste gresie veche? | Uneori da, dacă gresia este bine fixată și suprafața este plană, rosturile mari sunt umplute și diferența de nivel este acceptabilă. Cere firmei să verifice, nu presupune.',
    'Cum se renovează un parchet vechi? | Parchetul masiv sau triplustratificat se poate șlefui și lăcui, în limita grosimii stratului de uzură. Laminatul și SPC nu se șlefuiesc; la acestea se repară doar plăcile deteriorate sau se înlocuiește pardoseala.',
    'Cum se calculează manopera? | De obicei pe metru pătrat, dar depinde de tipul de parchet, de forma încăperii, de pregătirea suportului și de plinte. Cere în ofertă ce este inclus și vezi pagina de preț pentru manoperă.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Montaj parchet: laminat, SPC și sistem click', subtitle: 'Ce pregătești înainte, în ce ordine se lucrează și ce conține manopera. Dacă preferi să o facă o firmă, ceri oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Montaj', value: 'Flotant, cu click' },
      { label: 'Suport', value: 'Șapă plană, uscată' },
      { label: 'La pereți', value: 'Rost de dilatare' },
      { label: 'Finalizare', value: 'Plinte și profile' },
    ] }),
    node('intro', 'text', { body: para(
      'Parchetul laminat și plăcile SPC sunt cele mai alese pardoseli pentru locuințe, în parte pentru că se montează relativ repede, cu îmbinare click, fără adeziv. Aspectul final depinde însă mai mult de suportul de dedesubt decât de produs: o șapă neplană se simte la pas și face îmbinările să cedeze.',
      'Pagina de față acoperă montajul și manopera. Alegerea între laminat, SPC sau parchet masiv ține de utilizare și de buget și merită discutată cu un specialist înainte de cumpărare.',
    ) }),
    node('where-h', 'heading', { text: 'Ce este lucrarea și unde se aplică', level: 'h2' }),
    node('where', 'cards', { columns: '2', items: [
      { title: 'Parchet laminat', text: 'Plăci cu îmbinare click, montate flotant pe substrat; sensibile la apă stătută și la umiditatea din șapă.' },
      { title: 'Plăci SPC', text: 'Plăci rigide cu îmbinare click, mai tolerante la umiditate; sunt alese des în bucătării și holuri, dar rămân sensibile la suport neplan.' },
      { title: 'Parchet masiv sau triplustratificat', text: 'Se poate lipi sau fixa; montajul cere mai multă experiență și atenție la umiditatea suportului.' },
      { title: 'Renovări', text: 'Înlocuirea unei pardoseli vechi sau repararea unui parchet existent, după evaluarea suportului.' },
    ] }),
    node('mat-h', 'heading', { text: 'Materiale și soluții', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Pe lângă plăcile de parchet, un montaj complet cuprinde folia contra umidității, substratul (dacă nu este integrat), plintele, profilele de trecere și, la nevoie, produse de nivelare a șapei. Fișa producătorului stabilește ce substrat este compatibil, ce tip de pardoseală radiantă este acceptat și ce rost se lasă la pereți.',
      'La încălzirea în pardoseală, parchetul se alege și se montează conform indicațiilor producătorului, iar pornirea încălzirii se face treptat. Nu improviza acest pas.',
    ) }),
    node('steps', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Verificarea suportului', text: 'Planeitate, umiditate, curățenie. Neregularitățile se corectează înainte de orice altceva.' },
      { title: 'Aclimatizarea parchetului', text: 'Pachetele stau în încăpere un timp indicat de producător, ca materialul să se adapteze la temperatură și umiditate.' },
      { title: 'Folia și substratul', text: 'Se întind pe toată suprafața, cu îmbinări sigilate conform instrucțiunilor.' },
      { title: 'Montajul plăcilor', text: 'Se pornește de la un perete, cu atenție la decalarea rândurilor, cu rost de dilatare la pereți și la obstacole.' },
      { title: 'Tăieri și treceri', text: 'Tocuri de uși, țevi, praguri; se tratează cu atenție ca să nu blocheze mișcarea pardoselii.' },
      { title: 'Plinte și profile', text: 'Se montează la final, fixate de perete și nu de parchet, și acoperă rostul de dilatare.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Șapă neplană sau umedă', text: 'Cauza cea mai des întâlnită a îmbinărilor desfăcute și a parchetului care se umflă.' },
      { title: 'Fără rost de dilatare', text: 'Pardoseala blocată de pereți se ridică la schimbări de temperatură sau umiditate.' },
      { title: 'Substrat sau folie neadecvate', text: 'Un substrat prea moale sau incompatibil rupe sistemul click.' },
      { title: 'Plinte fixate în parchet', text: 'Plinta trebuie prinsă de perete, ca parchetul să se miște liber.' },
      { title: 'Montaj fără aclimatizare', text: 'Plăcile se pot muta după montaj și apar rosturi între ele.' },
      { title: 'Ignorarea fișei producătorului', text: 'Condițiile de garanție depind adesea de respectarea ei.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Manopera depinde de suprafață, de tipul de parchet, de forma încăperilor (multe colțuri și tăieri cer mai mult timp), de pregătirea suportului, de demontarea pardoselii vechi, de plinte și profile și de etajul și accesul. Montajul în diagonală sau în model special se plătește de obicei altfel decât cel drept.',
      'Pentru repere vezi pagina de preț a manoperei la parchet, dar cere întotdeauna oferta pe lucrări.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Compară ce intră în fiecare ofertă: nivelarea suportului, folia și substratul, plintele, profilele, demontarea și evacuarea pardoselii vechi, transportul materialelor. O ofertă care pare ieftină poate exclude exact aceste elemente și le adaugă pe parcurs.',
    ) }),
    node('firm-h', 'heading', { text: 'Cum alegi o firmă', level: 'h2' }),
    node('firm', 'text', { body: para(
      'Cere lucrări făcute, de preferat poze sau vizită la una dintre ele, și vezi cum rezolvă tocurile de uși și trecerile între încăperi, unde se văd diferențele între o echipă atentă și una grăbită. Cere să verifice suportul la fața locului, înainte să dea prețul.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre montajul parchetului' }),
    node('prices', 'price_links', { title: 'Prețuri pentru pardoseli' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la pardoseli și placări' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie încăperile și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
