import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const curatareIgienizareAerConditionat: SituationContent = {
  slug: 'climatizare--curatare-igienizare-aer-conditionat',
  categorie: 'climatizare',
  title: 'Curățare și igienizare aer condiționat: cine o face și cât de des',
  seoTitle: 'Curățare și igienizare aer condiționat: ce include',
  seoDescription: 'Curățarea și igienizarea aerului condiționat: ce se curăță, ce poți face singur, ce lasă pe seama unei firme, în ce ordine se lucrează și cum compari ofertele.',
  summary: 'Ce înseamnă curățarea și igienizarea unui aer condiționat, ce poți face singur, când chemi o firmă și cum compari ofertele.',
  sinonime: ['curatare aer conditionat', 'curatat aer conditionat', 'igienizare aer conditionat', 'igienizat aer conditionat', 'igienizare aer conditionat pret'],
  intrebari: [
    'Ce se curăță la un aer condiționat? | Filtrele, schimbătorul de căldură (radiatorul) al unității interioare, tăvița și scurgerea condensului, ventilatorul, iar la unitatea exterioară schimbătorul de căldură și ventilatorul. Igienizarea înseamnă în plus tratarea cu un produs dezinfectant destinat acestor aparate.',
    'Pot curăța singur aparatul? | Filtrele da, de regulă: se scot, se spală conform instrucțiunilor și se usucă bine înainte de a fi puse la loc. Curățarea schimbătorului, a ventilatorului și a scurgerii cere demontarea carcasei și atenție la componentele electrice, așa că se lasă de obicei pe seama unei firme.',
    'Cât de des se curăță aparatul? | Depinde de cât de mult funcționează, de praf, de animale în casă și de mediu. Instrucțiunile producătorului și firma de service îți pot recomanda un interval; filtrele se verifică mai des decât restul aparatului.',
    'De ce miroase urât aerul de la aparat? | Cauze frecvente sunt filtrele murdare, umezeala și depunerile din tăvița de condens sau de pe schimbător. O curățare și igienizare rezolvă de obicei problema; dacă mirosul revine, firma trebuie să verifice și scurgerea.',
    'Ce este diferența dintre curățare și igienizare? | Curățarea elimină murdăria și praful de pe componente. Igienizarea adaugă un tratament cu produs dezinfectant pentru mucegai și bacterii. În ofertă vezi ce anume este inclus în fiecare variantă.',
    'Se curăță și unitatea exterioară? | Da, schimbătorul de căldură al unității exterioare se poate colmata cu praf, polen sau frunze, ceea ce reduce randamentul. Curățarea se face de obicei cu apă la presiune moderată, fără a deforma lamelele.',
    'Cât costă curățarea sau igienizarea? | Depinde de tipul și numărul de unități, de cât de murdare sunt, de accesul la ele și de dacă se curăță și unitatea exterioară. Cere în ofertă lista operațiunilor și vezi pagina de prețuri pentru climatizare.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Curățare și igienizare aer condiționat', subtitle: 'Ce se curăță, ce poți face singur și când este bine să chemi o firmă. Primești oferte gratuite de la firme din zona ta.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Poți face singur', value: 'Spălarea filtrelor' },
      { label: 'De la o firmă', value: 'Schimbător, ventilator, scurgere' },
      { label: 'Semne de alarmă', value: 'Miros, scurgeri, aer slab' },
      { label: 'Igienizare', value: 'Tratament dezinfectant' },
    ] }),
    node('intro', 'text', { body: para(
      'Un aparat de aer condiționat trage aer prin filtre și îl trece peste o suprafață rece, pe care se formează umezeală. Dacă nu este curățat, pe filtre și în interior se adună praf, iar umezeala favorizează mucegaiul și mirosurile. Rezultatul se vede în aerul mai puțin curat, în randament mai slab și, uneori, în scurgeri de apă.',
      'Aici găsești ce se curăță, ce poți face singur și ce este mai bine lăsat pe seama unei firme, plus cum compari ofertele.',
    ) }),
    node('what-h', 'heading', { text: 'Ce înseamnă curățare și igienizare', level: 'h2' }),
    node('what', 'text', { body: para(
      'Curățarea înseamnă eliminarea prafului și a murdăriei de pe filtre, schimbătorul de căldură, ventilator și tăvița de condens. Igienizarea merge un pas mai departe: se aplică un produs dezinfectant destinat aparatelor de climatizare, pentru a limita mucegaiul și bacteriile din interior.',
      'Termenii sunt folosiți diferit de firme, așa că întreabă ce operațiuni intră exact în lucrare și ce produs se folosește.',
    ) }),
    node('where-h', 'heading', { text: 'Ce componente se tratează', level: 'h2' }),
    node('where', 'cards', { columns: '2', items: [
      { title: 'Filtrele', text: 'Se scot și se spală; sunt prima barieră pentru praf și se murdăresc cel mai repede.' },
      { title: 'Schimbătorul interior și ventilatorul', text: 'Aici se acumulează praf și umezeală; se curăță după demontarea carcasei, cu protejarea componentelor electrice.' },
      { title: 'Tăvița și scurgerea condensului', text: 'Depunerile pot astupa scurgerea; apa se revarsă apoi pe perete sau pe pardoseală.' },
      { title: 'Unitatea exterioară', text: 'Schimbătorul se poate colmata cu praf, polen sau frunze și își reduce randamentul.' },
    ] }),
    node('mat-h', 'heading', { text: 'Cum se face: variante', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Întreținerea simplă, pe care o poți face singur, înseamnă spălarea periodică a filtrelor, conform instrucțiunilor aparatului, și uscarea lor completă înainte de montare. Nu folosi detergenți agresivi sau apă fierbinte dacă manualul nu o permite.',
      'Curățarea completă o face de obicei o firmă, cu produse și unelte potrivite: se protejează componentele electrice, se spală schimbătorul și ventilatorul cu soluții destinate, se curăță scurgerea și se aplică tratamentul dezinfectant. La unitatea exterioară se curăță schimbătorul, fără a deforma lamelele.',
      'Nu pulveriza produse necunoscute în aparat și nu spăla componentele cu jet puternic: poți strica electronica sau lamelele schimbătorului.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Oprirea și protejarea', text: 'Aparatul se oprește de la alimentare, iar zona din jur și componentele electrice se protejează.' },
      { title: 'Demontarea carcasei și a filtrelor', text: 'Se scot filtrele și capacul pentru acces la schimbător și ventilator.' },
      { title: 'Curățarea componentelor', text: 'Se curăță schimbătorul, ventilatorul și tăvița cu soluții și unelte potrivite.' },
      { title: 'Scurgerea condensului', text: 'Se verifică și se curăță furtunul de scurgere, astfel încât apa să curgă liber.' },
      { title: 'Igienizarea', text: 'Se aplică tratamentul dezinfectant, conform instrucțiunilor produsului.' },
      { title: 'Montare și probă', text: 'Se montează la loc piesele, se pornește aparatul și se verifică funcționarea și lipsa scurgerilor.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Filtre puse umede', text: 'Umezeala rămasă ajută mucegaiul; lasă-le să se usuce complet.' },
      { title: 'Jet puternic pe schimbător', text: 'Se pot deforma lamelele sau uda componentele electrice.' },
      { title: 'Produse nepotrivite', text: 'Folosește doar produse destinate aparatelor de climatizare, conform instrucțiunilor.' },
      { title: 'Scurgerea ignorată', text: 'O scurgere astupată strică curățenia făcută și produce scurgeri de apă.' },
      { title: 'Amânarea până apar mirosuri', text: 'Murdăria acumulată se curăță mai greu și aparatul lucrează mai slab între timp.' },
      { title: 'Curățarea doar a unității interioare', text: 'Și unitatea exterioară influențează randamentul.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Prețul depinde de tipul și numărul de unități, de cât sunt de murdare, de accesul la ele (înălțime, spațiu îngust), de dacă se curăță și unitatea exterioară și de dacă se aplică și igienizarea. Mai multe aparate în aceeași vizită se tratează adesea mai economic decât vizite separate, dar întreabă firma.',
      'Pentru repere de preț, vezi paginile de prețuri din categoria climatizare.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Cere lista operațiunilor: se curăță doar filtrele sau și schimbătorul, ventilatorul și scurgerea? Intră unitatea exterioară? Se face igienizare cu produs dezinfectant? Se verifică funcționarea la final? Două oferte sunt comparabile doar dacă acoperă aceleași operațiuni.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi o firmă', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Alege o firmă care îți explică ce face și cu ce produse, care protejează mobila și componentele electrice și care verifică aparatul după lucrare. Întreabă dacă poate face și mici reparații sau diagnostic dacă observă o problemă, ca să nu fii nevoit să chemi altă echipă.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre curățarea aerului condiționat' }),
    node('prices', 'price_links', { title: 'Prețuri pentru climatizare' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la climatizare' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca aparatul să fie curățat de o firmă?', text: 'Descrie aparatul și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
