import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const alarmaSmartHome: SituationContent = {
  slug: 'securitate-automatizari--alarma-smart-home',
  categorie: 'securitate-automatizari',
  title: 'Sisteme de alarmă și smart home',
  seoTitle: 'Sisteme de alarmă și smart home: alegere și montaj',
  seoDescription: 'Alarmă antiefracție și casă inteligentă: ce componente există, ce faci tu și ce face electricianul, de ce depinde costul și cum compari ofertele instalatorilor.',
  summary: 'Ce cuprinde un sistem de alarmă sau de casă inteligentă, ce poți configura singur și ce lucrări revin unui instalator sau electrician.',
  sinonime: ['smart home', 'casa inteligenta', 'sisteme alarma', 'alarma casa', 'sistem alarma pret', 'alarma antiefractie', 'casă inteligentă', 'sisteme alarmă', 'alarmă casă', 'sistem alarmă preț', 'alarmă antiefracție'],
  intrebari: [
    'Ce este un sistem de alarmă antiefracție? | Un ansamblu de senzori (de ușă, de geam, de mișcare), o centrală și o sirenă sau o notificare. Când senzorii detectează o intrare neobișnuită, centrala dă alarmă. Poate fi legat și la un serviciu de monitorizare, dacă îl alegi.',
    'Ce înseamnă „smart home”? | Un set de dispozitive care pot fi comandate de la distanță sau automat: lumini, încălzire, jaluzele, prize, alarmă. Legătura se face printr-o rețea și o aplicație. Nu este un singur produs, ci o combinație care se alege după ce vrei să automatizezi.',
    'Pot monta singur o alarmă sau dispozitive smart? | Dispozitivele alimentate de la baterii sau de la priză se pot monta de proprietar, urmând instrucțiunile. Orice lucrare în tablou, pe circuitele casei sau cu conexiuni fixe o face un electrician autorizat.',
    'Ce rol are electricianul? | Se ocupă de alimentare, de circuitele noi, de modificările din tablou și de protecțiile electrice. Un sistem foarte bun pe hârtie nu e sigur dacă alimentarea e făcută neglijent.',
    'Care sunt riscurile pentru securitatea datelor? | Dispozitivele conectate la internet pot fi accesate de persoane neautorizate dacă au parole slabe sau programe neactualizate. Schimbă parolele implicite, actualizează aparatele și limitează accesul.',
    'Alarma este legată la camere sau la interfon? | Poate fi, dar nu este obligatoriu. Dacă vrei un sistem integrat, discută de la început cu firma, ca să nu cumperi componente care nu se înțeleg între ele. Camerele ridică și reguli privind viața privată, descrise pe pagina lor.',
    'Ce se întâmplă la o pană de curent? | Depinde de sistem. Unele centrale au acumulator propriu, altele nu. Întreabă ce se întâmplă la pană de curent sau de internet și ce se poate comanda manual.',
    'De ce depinde costul? | De numărul de senzori și de dispozitive, de tipul centralei, de modul de legare (cablu sau fără fir), de integrarea cu alte sisteme și de lucrările electrice necesare. Cere ofertă detaliată.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Alarmă și smart home: ce alegi și cine face fiecare lucrare', subtitle: 'Senzori, centrale și automatizări pentru casă. Vezi ce poți face singur, ce cere electrician și cum compari ofertele.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Alarmă', value: 'Senzori, centrală, sirenă sau notificare' },
      { label: 'Smart home', value: 'Dispozitive comandate local sau de la distanță' },
      { label: 'Electric', value: 'Electrician pentru tablou și circuite' },
      { label: 'Atenție', value: 'Parole și actualizări' },
    ] }),
    node('intro', 'text', { body: para(
      'Alarma și casa inteligentă ajung adesea în aceeași discuție, pentru că folosesc aceleași idei: senzori, o centrală și o aplicație. Diferă scopul: alarma protejează împotriva intrărilor neautorizate, iar smart home-ul automatizează confortul, de la lumini la încălzire.',
      'Pagina te ajută să separi ce vrei cu adevărat, să vezi ce lucrări rămân unui specialist și să compari ofertele fără să cazi în capcana „sistemului care face totul”.',
    ) }),
    node('what-h', 'heading', { text: 'Ce componente există', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Senzori', text: 'De deschidere pentru uși și geamuri, de mișcare și, după caz, de fum sau de inundație. Se aleg după riscurile reale.' },
      { title: 'Centrala și sirena', text: 'Centrala primește semnalele senzorilor și decide ce face. Sirena sau notificarea anunță evenimentul.' },
      { title: 'Dispozitive smart', text: 'Prize, întrerupătoare, termostate sau jaluzele comandate din aplicație ori automat.' },
      { title: 'Monitorizare', text: 'Opțional, alarma poate fi legată la un serviciu care primește semnalul. Condițiile se discută cu furnizorul.' },
    ] }),
    node('where-h', 'heading', { text: 'Ce faci tu și ce face specialistul', level: 'h2' }),
    node('where', 'text', { body: para(
      'Dispozitivele pe baterii sau cu alimentare prin priză se pot instala de proprietar, urmând instrucțiunile producătorului. Lucrările pe circuitele casei, în tablou sau cu alimentare fixă țin de electricianul autorizat. Un instalator de sisteme de securitate se ocupă de configurarea centralei și a senzorilor.',
      'Dacă lucrarea cere modificări în instalația electrică, vezi și situațiile despre tablou și instalația electrică a casei, ca să se coordoneze corect. În bloc, nu modifica părți comune fără acordul asociației.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Ce vrei să protejezi sau să automatizezi', text: 'Scrii o listă simplă: intrări, geamuri, camere, funcții smart dorite.' },
      { title: 'Alegerea arhitecturii', text: 'Sistem cu cablu sau fără fir, o singură platformă sau mai multe; firma explică avantajele și limitele.' },
      { title: 'Lucrări electrice', text: 'Dacă sunt necesare circuite sau alimentări noi, le face electricianul autorizat înaintea sistemului.' },
      { title: 'Montaj și configurare', text: 'Se montează senzorii și centrala, se leagă dispozitivele și se creează scenariile.' },
      { title: 'Test și instruire', text: 'Se verifică declanșarea, notificările, funcționarea la pană de curent și se explică utilizarea.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Dispozitive incompatibile', text: 'Piese luate separat pot să nu comunice între ele sau să ceară mai multe aplicații.' },
      { title: 'Parole implicite', text: 'Lăsarea parolelor din fabrică permite accesul persoanelor străine.' },
      { title: 'Alimentare slabă', text: 'Un sistem fără alimentare de rezervă se oprește când lipsește curentul.' },
      { title: 'Senzori puși la întâmplare', text: 'Poziția greșită dă alarme false sau lasă puncte neacoperite.' },
      { title: 'Intervenții în tablou fără electrician', text: 'Conexiunile făcute improvizat sunt un risc electric.' },
      { title: 'Prea multe automatizări', text: 'Un sistem complicat greu de folosit ajunge ignorat.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de numărul de senzori și de dispozitive, de tipul centralei, de modul de legare, de integrarea cu alte sisteme, de lucrările electrice și de eventuala monitorizare. O alarmă simplă și o casă automatizată pe mai multe niveluri nu se compară direct.',
      'Cere ofertă care separă echipamentele de manoperă și spune ce abonamente sau taxe recurente există. Pentru ordin de mărime, vezi paginile de preț de mai jos.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Verifică ce intră în ofertă și ce nu: senzorii, centrala, sirena, alimentarea de rezervă, manopera, configurarea. Întreabă ce se întâmplă dacă firma dispare sau dacă platforma se schimbă și cine are acces la configurație.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Alege o firmă care vine la fața locului, întreabă ce te îngrijorează de fapt și nu promite un sistem care „face totul”. Cere referințe, explicații despre securitatea datelor și clarificare privind cine face partea electrică.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre alarmă și smart home' }),
    node('prices', 'price_links', { title: 'Prețuri pentru securitate și automatizări' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la securitate și automatizări' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca sistemul să-l monteze o firmă?', text: 'Descrie locuința și ce vrei să protejezi sau să automatizezi și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
