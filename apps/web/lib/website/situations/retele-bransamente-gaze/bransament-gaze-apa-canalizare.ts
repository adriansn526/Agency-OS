import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const bransamentGazeApaCanalizare: SituationContent = {
  slug: 'retele-bransamente-gaze--bransament-gaze-apa-canalizare',
  categorie: 'retele-bransamente-gaze',
  title: 'Branșament gaze, apă și canalizare',
  seoTitle: 'Branșament gaze, apă și canalizare: pași și costuri',
  seoDescription: 'Cum faci racordarea casei la gaze, apă și canalizare: cine execută, avizul de la operator, ce se plătește, de ce depinde costul și cum compari ofertele.',
  summary: 'Ce este un branșament, cine îl execută, ce pași urmezi la operatorul de rețea, de ce depinde costul și ce compari în ofertele pentru lucrările de pe proprietatea ta.',
  sinonime: ['bransament gaze', 'bransament apa', 'bransament canalizare', 'racordare gaze', 'racordare apa', 'racordare canalizare casa', 'taxa racordare gaze', 'calculator bransament gaze', 'bransament apa pret', 'bransamente', 'branșament gaze', 'branșament apă', 'branșament canalizare', 'racordare apă', 'racordare canalizare casă', 'taxă racordare gaze', 'branșament apă preț', 'branșamente'],
  intrebari: [
    'Ce este un branșament? | Este legătura dintre rețeaua publică (gaze, apă, canalizare) și instalația casei tale. Racordarea la rețea se face de operatorul de distribuție sau de apă-canal; partea de pe proprietatea ta se proiectează și se execută separat, de personal autorizat.',
    'Cine face racordarea la rețeaua de gaze? | Operatorul de distribuție, pe baza avizului și a contractului. Instalația din casă (conducte, aparate, cămin) o execută un instalator autorizat ANRE, conform proiectului. Lucrul pe gaz nu este pentru cont propriu: pagina despre instalațiile de gaze explică partea din casă.',
    'Ce pași urmez pentru un branșament nou? | Cererea la operator, avizul tehnic de racordare, proiectul și execuția, apoi contractul și punerea în funcțiune. Documentele cerute și ordinea exactă diferă de la operator la operator și de la tipul rețelei, deci întreabă la operatorul din zona ta.',
    'Cât costă un branșament și ce taxe există? | Depinde de operator, de distanța până la rețea, de tipul de rețea și de lucrările de pe proprietate. Taxele și tarifele de racordare le stabilește și le comunică operatorul; nu te baza pe cifre din discuții. Cere-le în scris de la sursă.',
    'Pot face singur săpătura sau pozarea conductei? | La apă și canalizare, o parte din lucrările de pe proprietate pot fi făcute de firme de construcții, cu respectarea cerințelor operatorului. La gaz, execuția rămâne la personal autorizat. În toate cazurile, întreabă operatorul ce acceptă și ce verifică.',
    'Ce se întâmplă dacă nu am rețea în stradă? | Soluțiile diferă: extinderea rețelei, uneori cu participarea mai multor vecini, sau surse proprii, cum sunt puțul și fosa. Ce se poate depinde de zonă și de operator; pentru puț vezi pagina despre foraj, iar pentru fosă, pagina de instalații sanitare.',
    'Branșamentul electric intră aici? | Nu, branșamentul electric are pagina lui, la instalații electrice. Acolo vezi pașii cu operatorul de rețea electrică și lucrările din tablou.',
    'De ce depinde costul lucrărilor de pe proprietate? | De distanța între punctul de racord și casă, de tipul terenului și al suprafeței de refăcut (pământ, pavaj, asfalt), de adâncimea și accesul pentru săpătură și de materialele conductei. Cere ofertă separată pentru fiecare lucrare.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Branșament la gaze, apă și canalizare: pași, cine face și ce compari', subtitle: 'Ce faci tu, ce face operatorul, ce taxe se cer la sursă și de ce depinde costul lucrărilor. Dacă ai nevoie de o firmă pentru lucrările de pe proprietate, ceri oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Racordarea', value: 'O face operatorul de rețea' },
      { label: 'Taxe și tarife', value: 'Se cer în scris la operator' },
      { label: 'Gaz', value: 'Doar instalator autorizat ANRE' },
      { label: 'Pe proprietatea ta', value: 'Ofertă separată, pe lucrări' },
    ] }),
    node('intro', 'text', { body: para(
      'Pentru o casă nouă sau pentru una care nu are încă utilități, branșamentele sunt printre primele lucrări de pus la punct. Fiecare utilitate are operatorul ei, condițiile ei și un traseu de documente și lucrări care nu seamănă cu al celorlalte.',
      'Pagina explică diferența dintre racordarea făcută de operator și lucrările de pe proprietatea ta și te ajută să ceri oferte corecte pentru partea care îți revine. Branșamentul electric are pagina lui la instalații electrice.',
    ) }),
    node('what-h', 'heading', { text: 'Cele trei tipuri de branșament', level: 'h2' }),
    node('what', 'cards', { columns: '3', items: [
      { title: 'Gaze naturale', text: 'Operatorul de distribuție execută racordarea la rețea. Instalația din casă, cu aparatele și racordurile, se execută de instalator autorizat ANRE, după proiect.' },
      { title: 'Apă', text: 'Operatorul de apă stabilește punctul de racord, contorul și condițiile. Conducta de pe proprietate se pune după cerințele lui.' },
      { title: 'Canalizare', text: 'Se racordează la rețeaua publică unde există; unde nu există, se discută soluții alternative și condițiile locale cu operatorul.' },
    ] }),
    node('who-h', 'heading', { text: 'Ce face operatorul și ce faci tu', level: 'h2' }),
    node('who', 'text', { body: para(
      'Operatorul decide punctul de racord, emite avizul tehnic de racordare, execută sau recepționează legătura la rețea și încheie contractul de furnizare sau de serviciu. Taxele, tarifele și documentele cerute se află de la el, nu din surse indirecte.',
      'Tu răspunzi de proiectul de pe proprietate acolo unde se cere, de pregătirea traseului și, după caz, de angajarea unor firme autorizate pentru partea ta de lucrare. Nu începe săpătura sau lucrări pe care operatorul nu le-a acceptat, fiindcă pot fi refăcute.',
    ) }),
    node('steps', 'steps', { title: 'Ordinea obișnuită a unui branșament', items: [
      { title: 'Verifici ce rețea există în zonă', text: 'Întrebi operatorul dacă rețeaua trece pe strada ta și în ce condiții te poți racorda.' },
      { title: 'Ceri avizul tehnic de racordare', text: 'Depui cererea cu actele cerute de operator. Răspunsul stabilește condițiile și ce trebuie proiectat.' },
      { title: 'Proiect și autorizări', text: 'Proiectul pentru partea de pe proprietate se întocmește de specialiști autorizați. Dacă lucrarea cere acte la primărie, le obții înainte de săpătură.' },
      { title: 'Execuția lucrărilor', text: 'Operatorul execută racordarea; firma aleasă de tine execută ce îi revine, în condițiile acceptate de operator.' },
      { title: 'Recepție și contract', text: 'Operatorul verifică lucrarea, apoi se încheie contractul și se montează contorul sau se pune în funcțiune.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Începerea lucrărilor fără aviz', text: 'Traseul sau materialele pot fi respinse și lucrarea refăcută.' },
      { title: 'Presupunerea unei taxe „standard”', text: 'Tarifele se stabilesc la operator și pot diferi; cere-le în scris.' },
      { title: 'Executarea instalației de gaz de persoane neautorizate', text: 'Este periculos și nu se poate pune în funcțiune fără recepția cerută.' },
      { title: 'Neluarea în calcul a refacerii suprafețelor', text: 'Pavajul, asfaltul sau gazonul desfăcute pentru săpătură se refac, iar costul trebuie inclus în ofertă.' },
      { title: 'Traseu nemarcat față de alte rețele', text: 'Înainte de săpătură se verifică ce conducte și cabluri trec pe teren.' },
      { title: 'Ofertă fără defalcare', text: 'Cere separat săpătura, conducta, refacerea și, unde e cazul, proiectul.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul total are două părți: ce plătești operatorului (taxe, tarife, lucrările pe care le face el) și ce plătești firmelor pentru partea de pe proprietatea ta. Prima parte se află doar de la operator; a doua depinde de distanța până la punctul de racord, de tipul solului și al suprafeței refăcute, de adâncimea săpăturii și de materiale.',
      'Dacă mai mulți vecini se racordează împreună, condițiile pot fi diferite; întreabă operatorul. Pentru instalațiile din casă, vezi paginile de preț de la instalații, nu cifre din surse neverificate.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Cere de la fiecare firmă o ofertă separată pe lucrări: săpătură, conductă și accesorii, refacerea suprafeței, proiect dacă e cazul. Verifică dacă prețul include materialele și ce se întâmplă dacă săpătura întâlnește obstacole neprevăzute.',
      'Întreabă dacă firma a lucrat cu operatorul din zona ta și cunoaște ce cere acesta la recepție. Fii atent la cine face legătura cu operatorul: firma sau tu.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Pentru gaz, cere dovada autorizării ANRE a executantului. Pentru apă și canalizare, întreabă dacă firma are experiență cu cerințele operatorului din zona ta și cere lucrări similare pe care le poți vedea.',
      'Fă înțelegerea în scris, cu lucrările incluse, termenul și garanția. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre branșamente' }),
    node('prices', 'price_links', { title: 'Prețuri pentru instalații și racorduri' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la branșamente și rețele' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de o firmă pentru lucrările de pe proprietate?', text: 'Descrie situația și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
