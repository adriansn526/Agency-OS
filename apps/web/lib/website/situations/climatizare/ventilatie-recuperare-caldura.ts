import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const ventilatieRecuperareCaldura: SituationContent = {
  slug: 'climatizare--ventilatie-recuperare-caldura',
  categorie: 'climatizare',
  title: 'Ventilație cu recuperare de căldură: alegere și montaj',
  seoTitle: 'Ventilație cu recuperare de căldură: alegere și montaj',
  seoDescription: 'Ventilația cu recuperare de căldură: cum funcționează, unde se potrivește, ce tipuri de sisteme există, cum se montează și cum compari ofertele firmelor.',
  summary: 'Cum funcționează ventilația cu recuperare de căldură, ce tipuri de sisteme există, ce implică montajul și cum compari ofertele.',
  sinonime: ['ventilatie cu recuperare de caldura', 'ventilator cu recuperare de caldura', 'sistem de ventilatie cu recuperare de caldura', 'sistem de ventilatie cu recuperator de caldura', 'recuperator de caldura', 'recuperare caldura'],
  intrebari: [
    'Cum funcționează un recuperator de căldură? | Aerul viciat evacuat din casă și aerul proaspăt adus din exterior trec printr-un schimbător, fără să se amestece. Căldura (iarna) sau răcoarea (vara) din aerul evacuat este transferată în mare parte aerului proaspăt, deci pierzi mai puțină energie la ventilare.',
    'De ce am nevoie de ventilație mecanică? | În casele etanșe, cu ferestre și izolație bune, aerul nu se mai reîmprospătează singur, iar umezeala, mirosurile și dioxidul de carbon se acumulează. Ventilația mecanică asigură un aer proaspăt controlat, fără deschiderea permanentă a ferestrelor.',
    'Ce tipuri de sisteme există? | Sisteme centralizate, cu o unitate și o rețea de tubulatură către încăperi, și unități descentralizate, montate prin perete, pentru una sau câteva încăperi. Alegerea depinde de tipul clădirii și de dacă lucrezi la o construcție nouă sau la una existentă.',
    'Se poate monta într-o casă existentă? | Adesea da, dar tubulatura centralizată cere spațiu (tavan fals, pod, canale), iar unitățile descentralizate cer doar străpungeri prin perete. Un specialist poate spune ce variantă se potrivește locuinței tale.',
    'Are nevoie de întreținere? | Da: filtrele se verifică și se schimbă periodic, iar schimbătorul și tubulatura se curăță conform recomandărilor producătorului. Frecvența exactă o găsești în instrucțiunile aparatului.',
    'Recuperatorul răcește sau încălzește casa? | Nu, nu este un aparat de încălzire sau răcire. Reduce pierderile de energie la ventilare; încălzirea și răcirea se fac cu alte sisteme, de exemplu cu aer condiționat sau pompă de căldură.',
    'Cât costă un sistem cu recuperare de căldură? | Depinde de tipul sistemului, de numărul de încăperi, de lungimea tubulaturii, de felul clădirii și de dacă lucrezi în construcție nouă sau în una existentă. Cere oferte pe conținut și compară ce include fiecare.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Ventilație cu recuperare de căldură', subtitle: 'Cum funcționează, ce tipuri există și ce implică montajul. Primești oferte gratuite de la firme din zona ta.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Rol', value: 'Aer proaspăt, pierderi mai mici' },
      { label: 'Tipuri', value: 'Centralizat sau descentralizat' },
      { label: 'Întreținere', value: 'Filtre și curățare periodică' },
      { label: 'Costul depinde de', value: 'Sistem, tubulatură, clădire' },
    ] }),
    node('intro', 'text', { body: para(
      'O casă bine izolată și cu ferestre etanșe pierde puțină căldură, dar reține și aerul consumat, umezeala și mirosurile. Ventilația cu recuperare de căldură aduce aer proaspăt controlat și recuperează o mare parte din energia aerului evacuat, în loc să o piardă prin ferestre deschise.',
      'Pagina explică principiul, tipurile de sisteme, ce implică montajul și cum compari ofertele, ca să te poți orienta înainte să discuți cu o firmă.',
    ) }),
    node('what-h', 'heading', { text: 'Cum funcționează', level: 'h2' }),
    node('what', 'text', { body: para(
      'Sistemul are o unitate cu două ventilatoare, un schimbător de căldură și filtre. Un circuit scoate aerul din încăperile umede (baie, bucătărie), celălalt aduce aer din exterior în dormitoare și living. Cele două fluxuri trec prin schimbător fără să se amestece, iar căldura trece de la aerul evacuat la cel proaspăt.',
      'Rezultatul este un aer proaspăt, filtrat, dar nu rece iarna, și mai puțină umezeală acumulată în încăperi.',
    ) }),
    node('where-h', 'heading', { text: 'Unde se potrivește', level: 'h2' }),
    node('where', 'cards', { columns: '2', items: [
      { title: 'Case noi, bine izolate', text: 'Aici ventilația mecanică se poate proiecta de la început, cu tubulatura ascunsă în tavan sau în șapă.' },
      { title: 'Renovări cu schimbarea ferestrelor', text: 'După ce locuința devine mai etanșă, aerul nu se mai reîmprospătează singur și apare umezeala.' },
      { title: 'Apartamente', text: 'Se folosesc adesea unități descentralizate prin perete, care nu cer tubulatură în toată locuința.' },
      { title: 'Alergii și zone cu praf', text: 'Filtrele din sistem reduc praful și polenul din aerul adus din exterior.' },
    ] }),
    node('mat-h', 'heading', { text: 'Tipuri de sisteme și soluții', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Sistemul centralizat are o singură unitate și o rețea de tubulatură către încăperi; oferă un control bun al aerului, dar cere spațiu pentru conducte și, de preferat, planificare înainte de finisaje. Sistemul descentralizat folosește unități mici, montate prin peretele exterior, pentru una sau câteva încăperi; se potrivește renovărilor și apartamentelor.',
      'Schimbătorul poate fi de mai multe tipuri; unele transferă doar căldura, altele și o parte din umezeală. Alegerea depinde de climă, de locuință și de recomandarea producătorului, iar dimensionarea după volumul de aer cerut o face un specialist.',
      'Nu confunda recuperatorul de căldură cu o hotă sau cu un simplu ventilator de baie: acestea evacuează aerul, dar nu recuperează căldura și nu aduc aer proaspăt filtrat.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Analiza locuinței', text: 'Se stabilesc necesarul de aer pe încăperi, tipul sistemului și traseele posibile.' },
      { title: 'Proiectarea traseelor', text: 'Se aleg locurile unității, ale prizei de aer proaspăt, ale evacuării și ale gurilor de aer.' },
      { title: 'Montajul tubulaturii', text: 'La construcții noi, înainte de finisaje; la renovări, în tavan fals, pod sau canale.' },
      { title: 'Montajul unității', text: 'Cu acces pentru filtre și cu scurgere pentru condens, dacă produsul o cere.' },
      { title: 'Reglajul debitelor', text: 'Se reglează debitele pe încăperi, ca aerul să circule echilibrat.' },
      { title: 'Punere în funcțiune și instruire', text: 'Primești explicații privind modurile de funcționare și schimbarea filtrelor.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Sistem subdimensionat', text: 'Debitele insuficiente nu elimină umezeala și aerul consumat.' },
      { title: 'Prize de aer prost plasate', text: 'Prea aproape de evacuare sau de surse de poluare; aerul proaspăt nu mai este proaspăt.' },
      { title: 'Tubulatură neizolată', text: 'Pe trasee reci poate apărea condens și pierderi de căldură.' },
      { title: 'Lipsa accesului la filtre', text: 'Dacă filtrele nu se schimbă ușor, sistemul este neglijat.' },
      { title: 'Zgomot neluat în calcul', text: 'Unitatea și gurile de aer trebuie alese și montate să nu deranjeze în dormitoare.' },
      { title: 'Neechilibrarea debitelor', text: 'Un sistem nereglat dă curenți în unele încăperi și aer stătut în altele.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de tipul sistemului (centralizat sau descentralizat), de numărul de încăperi, de lungimea și izolarea tubulaturii, de tipul schimbătorului și al filtrelor, de dificultatea montajului (construcție nouă sau existentă) și de lucrările de finisare ce urmează după. Costurile de întreținere vin separat: filtre și curățare periodică.',
      'Pentru repere de preț în climatizare, vezi paginile de prețuri din această categorie.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Cere să vezi pe ce se bazează dimensionarea (încăperi, debite), ce unitate se propune și ce include oferta: tubulatură, izolație, guri de aer, prize exterioare, montaj, reglaj și punere în funcțiune. Întreabă cum se schimbă filtrele și ce garanție se oferă. Ofertele sunt comparabile doar dacă pornesc de la aceleași încăperi și același tip de sistem.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi o firmă', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Alege o firmă care vine la fața locului, îți explică de ce propune un anumit tip de sistem și își asumă reglajul debitelor. Cere lucrări similare făcute și ofertă detaliată în scris. Dacă lucrezi la o casă nouă, discută cu firma înainte de finisaje, ca să nu fie nevoie de refaceri.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre ventilația cu recuperare de căldură' }),
    node('prices', 'price_links', { title: 'Prețuri pentru climatizare' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la climatizare' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca sistemul să fie montat de o firmă?', text: 'Descrie locuința și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
