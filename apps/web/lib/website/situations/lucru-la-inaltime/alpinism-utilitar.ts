import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const alpinismUtilitar: SituationContent = {
  slug: 'lucru-la-inaltime--alpinism-utilitar',
  categorie: 'lucru-la-inaltime',
  title: 'Alpinism utilitar: fațade, geamuri, acoperișuri',
  seoTitle: 'Alpinism utilitar: fațade, geamuri și acoperișuri',
  seoDescription: 'Ce este alpinismul utilitar, ce lucrări la înălțime acoperă (spălare geamuri și fațade, reparații), ce siguranță cere și cum compari ofertele echipelor.',
  summary: 'Ce lucrări se fac prin alpinism utilitar, când e potrivit față de alte metode, ce siguranță trebuie să existe și ce să compari în oferte.',
  sinonime: ['alpinism utilitar', 'alpinisti utilitari', 'lucru la inaltime', 'spalare geamuri exterior', 'spalare geamuri exterioare', 'spalat geamuri exterior', 'spalare fatada', 'alpiniști utilitari', 'lucru la înălțime', 'spălare geamuri exterior', 'spălare geamuri exterioare', 'spălat geamuri exterior', 'spălare fațadă'],
  intrebari: [
    'Ce este alpinismul utilitar? | O metodă de lucru la înălțime în care echipa se deplasează pe corzi, cu echipament special, pentru a ajunge la fațade, geamuri sau acoperișuri fără a monta schele. Se folosește pentru spălare, reparații, vopsire, montaj sau inspecții, acolo unde alte metode sunt mai greu de folosit.',
    'Când se alege alpinismul în loc de schelă sau nacelă? | Când accesul este dificil, lucrarea este punctuală sau montarea unei schele nu se justifică. Pentru lucrări mari și de durată, schela sau nacela pot fi mai potrivite. O firmă serioasă îți recomandă metoda după situație, nu o impune.',
    'Ce siguranță trebuie să existe? | Echipă instruită și autorizată pentru lucru la înălțime, echipament de protecție verificat, corzi de lucru și de siguranță, puncte de ancorare corecte și plan de intervenție. Cere firmei să explice cum se asigură și ce documente poate prezenta.',
    'Pot face singur spălarea geamurilor la înălțime? | La înălțime, improvizațiile sunt periculoase. Pentru etaje superioare sau fațade greu accesibile, apelează la o firmă cu echipă calificată. Nu urca pe acoperiș, balustrade sau scări improvizate ca să ajungi la geamuri.',
    'Ce lucrări se fac prin alpinism utilitar? | Spălarea geamurilor și a fațadelor, curățarea și vopsirea fațadelor, repararea fisurilor și a tencuielii, montajul de bannere sau echipamente, curățarea jgheaburilor, inspecții tehnice. Fiecare lucrare cere materiale și pregătire proprii.',
    'Este nevoie de acordul cuiva pentru lucrare? | La bloc, asociația și vecinii trebuie informați, iar uneori sunt necesare aprobări. Pentru lucrări care afectează domeniul public, întreabă la primărie. Firma te poate ghida, dar verifică și tu.',
    'De ce depinde costul? | De înălțimea și complexitatea fațadei, de suprafață, de tipul lucrării, de accesul la ancorare, de condiții meteo și de dacă materialele sunt incluse. Cere oferte care detaliază ce se face și vezi paginile de preț.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Alpinism utilitar: lucru la înălțime făcut de echipe calificate', subtitle: 'Spălare geamuri și fațade, reparații și inspecții fără schele. Ce siguranță trebuie să existe și cum compari ofertele.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Ce este', value: 'Lucru pe corzi, la înălțime' },
      { label: 'Cine îl face', value: 'Doar echipe calificate' },
      { label: 'Siguranță', value: 'Echipament verificat, ancorări corecte' },
      { label: 'Nu improviza', value: 'Nu urca singur pe fațadă' },
    ] }),
    node('intro', 'text', { body: para(
      'Alpinismul utilitar este o metodă prin care o echipă ajunge, folosind corzi și echipament special, la locuri greu accesibile: fațade înalte, geamuri, acoperișuri, coșuri. Se folosește când montarea unei schele ar fi disproporționată sau imposibilă.',
      'Lucrul la înălțime este periculos, iar pagina nu explică cum se face pe cont propriu. Ea te ajută să înțelegi ce lucrări se fac, cum arată o echipă serioasă și ce să compari în oferte.',
    ) }),
    node('what-h', 'heading', { text: 'Ce lucrări se fac', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Spălare geamuri și fațade', text: 'Pentru clădiri înalte sau cu acces dificil, cu produse potrivite suprafeței.' },
      { title: 'Reparații și finisaje', text: 'Fisuri, tencuieli, vopsitorii, etanșări în zone greu accesibile.' },
      { title: 'Acoperișuri și jgheaburi', text: 'Curățare, verificare și intervenții punctuale la învelitoare și scurgeri.' },
      { title: 'Montaj și inspecții', text: 'Montarea de panouri, bannere sau echipamente și inspecții vizuale ale fațadei.' },
    ] }),
    node('mat-h', 'heading', { text: 'Alpinism, schelă sau nacelă', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Alpinismul se potrivește lucrărilor punctuale sau de scurtă durată, în locuri unde schela nu poate fi montată ușor. Schela este mai potrivită lucrărilor ample și de lungă durată, unde mai mulți oameni lucrează simultan. Nacela sau platforma elevatoare sunt alternative când terenul permite accesul și lucrarea o justifică.',
      'Alegerea o face firma după vizita la fața locului, pe baza clădirii, a lucrării și a siguranței. Pentru închirierea schelei, vezi pagina dedicată.',
    ) }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea', items: [
      { title: 'Vizită și evaluare', text: 'Firma vede clădirea, punctele de ancorare și riscurile.' },
      { title: 'Plan de lucru', text: 'Se stabilesc metoda, echipa, echipamentul și zonele protejate.' },
      { title: 'Informarea locatarilor', text: 'La bloc, vecinii sunt anunțați și accesul este marcat.' },
      { title: 'Execuția', text: 'Echipa instalează ancorările și corzile și lucrează conform planului.' },
      { title: 'Verificare și predare', text: 'Se verifică rezultatul și se strâng echipamentele și deșeurile.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Improvizația', text: 'Lucrul la înălțime fără echipament și pregătire poate duce la accidente grave.' },
      { title: 'Alegerea doar după preț', text: 'O ofertă mult mai mică poate însemna echipament sau pregătire insuficiente.' },
      { title: 'Lipsa informării vecinilor', text: 'Poate genera nemulțumiri sau pericole pentru cei de jos.' },
      { title: 'Produse nepotrivite fațadei', text: 'Soluții de curățare agresive pot deteriora suprafețele.' },
      { title: 'Ignorarea vremii', text: 'Vântul și ploaia pot opri lucrarea; stabilește cum se reprogramează.' },
      { title: 'Ofertă vagă', text: 'Specifică suprafața, lucrarea, produsele și răspunderea.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de înălțime și complexitate, de suprafață, de tipul lucrării, de dificultatea ancorării, de condițiile meteo, de numărul de oameni din echipă și de materialele incluse. Aceeași fațadă poate avea oferte diferite în funcție de metodă.',
      'Cere oferte care detaliază ce se face, cu ce materiale și cum se asigură echipa. Pentru ordin de mărime, vezi paginile de preț.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Întreabă ce calificări și ce asigurări are echipa, ce echipament folosește și cum se asigură siguranța celor de la sol. Cere lucrări similare și referințe.',
      'Cere ofertă scrisă, cu detaliile lucrării și condițiile de plată, și clarifică cine răspunde dacă se produc daune.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre alpinismul utilitar' }),
    node('prices', 'price_links', { title: 'Prețuri pentru lucrări la înălțime' }),
    node('situation-links', 'situation_links', { title: 'Alte situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai o lucrare la înălțime?', text: 'Descrie clădirea și lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
