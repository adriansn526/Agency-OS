import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const revizieVerificareInstalatieGaze: SituationContent = {
  slug: 'instalatii-gaze--revizie-verificare-instalatie-gaze',
  categorie: 'instalatii-gaze',
  title: 'Revizie și verificare instalație de gaze',
  seoTitle: 'Revizie și verificare instalație de gaze: cine o face',
  seoDescription: 'Ce înseamnă revizia și verificarea instalației de gaze, cine o poate face, ce se controlează, de ce depinde costul și cum compari ofertele firmelor autorizate.',
  summary: 'Ce presupune revizia sau verificarea instalației de gaze, de ce o face doar o firmă autorizată ANRE și ce întrebi înainte să accepți o ofertă.',
  sinonime: ['revizie instalatie gaze', 'pret revizie instalatie gaze la 10 ani', 'verificare instalatie gaze pret', 'verificare instalatie gaze', 'verificare instalatii gaze', 'revizii instalatii gaze', 'revizie gaze', 'revizie gaze 10 ani', 'firma verificare gaze', 'verificare gaze', 'revizie instalație gaze', 'preț revizie instalație gaze la 10 ani', 'verificare instalație gaze preț', 'verificare instalație gaze', 'verificare instalații gaze', 'revizii instalații gaze', 'firmă verificare gaze'],
  intrebari: [
    'Ce este revizia instalației de gaze? | Este controlul periodic al instalației de utilizare din casă sau apartament, de la robinetul de după contor până la aparatele de consum. Urmărește dacă instalația este etanșă și sigură în funcționare. Se face doar de o firmă autorizată ANRE.',
    'Cât de des trebuie făcută revizia? | Periodicitatea și obligațiile proprietarului sunt stabilite prin reglementări care se pot schimba. Verifică la distribuitorul de gaze din zona ta sau la ANRE ce se aplică în cazul tău, în loc să te bazezi pe o cifră auzită de la alții.',
    'Pot face singur verificarea instalației de gaze? | Nu. Orice control al etanșeității, orice demontare sau reglaj îl face personal autorizat. Singurul lucru pe care îl poți face tu este să observi semnele neobișnuite (miros, aparate care funcționează anormal) și să anunți operatorul sau o firmă autorizată.',
    'Ce se verifică la o revizie? | De regulă etanșeitatea conductelor și îmbinărilor, starea robinetelor și a racordurilor flexibile, aparatele de consum, ventilarea încăperii și evacuarea gazelor arse. Cere firmei lista exactă a verificărilor, scrisă în ofertă sau în fișa de lucru.',
    'Ce documente primesc după revizie? | Un document de la firma care a făcut lucrarea, cu data, aparatele controlate și concluziile. Păstrează-l, pentru că distribuitorul sau o altă firmă îl poate cere, de exemplu la schimbarea unui aparat sau la un contract nou.',
    'Ce fac dacă revizia găsește probleme? | Firma trebuie să spună clar ce nu este în regulă și ce trebuie remediat. Pentru defecte care țin de siguranță, instalația poate fi oprită până la remediere. Remedierea se face tot de o firmă autorizată.',
    'De ce depinde costul reviziei? | De numărul și tipul aparatelor, de lungimea și accesibilitatea instalației, de deplasare și de ce intră în ofertă. Un preț foarte mic poate însemna un control superficial. Paginile de preț de mai jos explică ce influențează tariful.',
    'Cum verific dacă firma este autorizată? | Lista firmelor autorizate se consultă pe site-ul ANRE. Cere firmei datele de autorizare și verifică-le acolo. Situația „Instalator autorizat ANRE pentru gaze” de mai jos explică pașii.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Revizia instalației de gaze: ce presupune și cine o face', subtitle: 'Un control de siguranță care se face doar de o firmă autorizată ANRE. Vezi ce se verifică, ce întrebi și cum compari ofertele.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine o face', value: 'Firmă autorizată ANRE' },
      { label: 'Scop', value: 'Siguranța instalației' },
      { label: 'Periodicitate', value: 'Se verifică la distribuitor sau ANRE' },
      { label: 'Rezultat', value: 'Document scris de la firmă' },
    ] }),
    node('intro', 'text', { body: para(
      'Instalația de gaze din locuință lucrează în tăcere ani la rând, iar defectele nu se văd până când apare un miros, un aparat care se oprește sau, în cel mai rău caz, o scurgere. Revizia și verificarea sunt controalele prin care o firmă autorizată confirmă că instalația și aparatele rămân în stare sigură.',
      'Pagina explică ce înseamnă aceste controale, ce se urmărește, cum citești o ofertă și de ce nu e un lucru pe care să-l faci pe cont propriu. Despre regulile exacte privind frecvența și obligațiile, întreabă distribuitorul de gaze sau ANRE.',
    ) }),
    node('what-h', 'heading', { text: 'Ce este revizia și ce este verificarea', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Revizia', text: 'Control periodic al instalației de utilizare, făcut de o firmă autorizată, cu un document la final. Se programează, nu așteaptă o defecțiune.' },
      { title: 'Verificarea la cerere', text: 'Controlul făcut după o lucrare, o mutare, o schimbare de aparat sau când ai un motiv de îngrijorare. Se poate cere oricând unei firme autorizate.' },
      { title: 'Verificarea aparatelor', text: 'Centrala, aragazul sau alt consumator se controlează pe partea de gaz și de evacuare. Service-ul de aparat poate fi o lucrare separată.' },
      { title: 'Intervenția la defect', text: 'Dacă se găsește o problemă, remedierea este o lucrare distinctă și se face tot de personal autorizat.' },
    ] }),
    node('where-h', 'heading', { text: 'Unde se aplică', level: 'h2' }),
    node('where', 'text', { body: para(
      'Se aplică instalațiilor din case și apartamente racordate la rețeaua de gaze, indiferent dacă încălzirea se face cu centrală proprie sau gazul e folosit doar la aragaz. În blocuri, o parte din instalație este comună, deci regulile pot implica și asociația și distribuitorul.',
      'Dacă locuința a fost renovată, mutată sau dacă ai schimbat un aparat, instalația merită verificată de o firmă autorizată, chiar dacă nu a venit încă momentul unei revizii programate.',
    ) }),
    node('what-checked-h', 'heading', { text: 'Ce se urmărește la un control', level: 'h2' }),
    node('what-checked', 'text', { body: para(
      'Firma urmărește, de regulă, etanșeitatea conductelor și îmbinărilor, funcționarea robinetelor, starea racordurilor flexibile, aparatele de consum, aerisirea încăperii în care sunt montate și evacuarea corectă a gazelor arse. Metodele și aparatura sunt cele ale firmei autorizate.',
      'Întreabă ce verificări sunt incluse în ofertă și cere un document la final. Un control „din ochi”, fără aparatură și fără act, nu spune ce trebuie spus.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine decurge', items: [
      { title: 'Alegi firma și o verifici', text: 'Cauți o firmă autorizată și îi verifici datele pe site-ul ANRE, înainte să o chemi.' },
      { title: 'Programezi vizita', text: 'Stabilești data și te asiguri că firma are acces la contor, la aparate și la toate încăperile cu consumatori.' },
      { title: 'Controlul', text: 'Firma verifică instalația și aparatele, după procedurile ei autorizate. Tu nu intervii asupra instalației.' },
      { title: 'Concluzii', text: 'Primești constatările: ce este în regulă, ce trebuie remediat și cât de urgent.' },
      { title: 'Document și remedieri', text: 'Păstrezi documentul și, dacă e cazul, aprobi remedierile printr-o ofertă separată.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Amânarea controlului', text: 'Instalația pare să meargă, deci revizia se tot mută. Siguranța nu se vede din exterior.' },
      { title: 'Chemarea unei firme neverificate', text: 'Fără autorizare, documentul primit nu are valoare și controlul poate fi superficial.' },
      { title: 'Intervenții pe cont propriu', text: 'Strângerea unui racord sau schimbarea unui furtun fără personal autorizat poate crea o scurgere.' },
      { title: 'Oferta doar pe preț', text: 'Alegerea celui mai mic tarif fără a vedea ce verificări sunt incluse.' },
      { title: 'Lipsa documentului', text: 'Fără act scris, nu poți dovedi controlul distribuitorului sau unei alte firme.' },
      { title: 'Ignorarea semnelor', text: 'Un miros de gaz sau un aparat care funcționează neobișnuit nu se amână până la revizie.' },
    ] }),
    node('safety-h', 'heading', { text: 'Dacă simți miros de gaz', level: 'h2' }),
    node('safety', 'text', { body: para(
      'Ieși din încăpere, aerisește, nu aprinde nimic și nu folosi întrerupătoare sau telefon în interior. Sună de afară la numărul de urgență sau la distribuitor. Nu încerca să cauți sau să repari tu scurgerea. Aceasta este o regulă generală; urmează și indicațiile distribuitorului din zona ta.',
    ) }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Prețul depinde de numărul și tipul aparatelor controlate, de lungimea și accesibilitatea instalației, de deplasare și de documentele emise. Revizia unei locuințe cu o centrală și un aragaz nu seamănă cu cea a unei case cu mai multe puncte de consum.',
      'Nu căuta cifre fixe pe site-uri aleatorii. Cere ofertă scrisă și vezi paginile de preț de mai jos, care explică factorii care influențează tariful.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Compară ce verificări sunt cuprinse, dacă documentul final este inclus, dacă deplasarea e socotită separat și ce se întâmplă dacă se găsesc defecte. O ofertă care nu spune ce controlează nu poate fi comparată cu una detaliată.',
      'Întreabă și cum se anunță problemele găsite și cine face remedierea, pentru a nu fi surprins de costuri adăugate după vizită.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere datele de autorizare și verifică-le pe lista ANRE. Alege o firmă care vine la fața locului, explică ce face și lasă un document. Recenziile altor clienți și răspunsul clar la întrebări sunt semne bune.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre revizia instalației de gaze' }),
    node('prices', 'price_links', { title: 'Prețuri pentru instalații de gaze' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la instalații de gaze' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca revizia să o facă o firmă autorizată?', text: 'Descrie locuința și aparatele și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
