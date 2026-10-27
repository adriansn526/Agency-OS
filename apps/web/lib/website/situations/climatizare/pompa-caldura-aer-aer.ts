import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const pompaCalduraAerAer: SituationContent = {
  slug: 'climatizare--pompa-caldura-aer-aer',
  categorie: 'climatizare',
  title: 'Pompă de căldură aer-aer: alegere, montaj și cost',
  seoTitle: 'Pompă de căldură aer-aer: alegere, montaj, cost',
  seoDescription: 'Pompa de căldură aer-aer: cum funcționează, când se potrivește, ce montaj presupune, de ce depinde costul și cum compari ofertele firmelor.',
  summary: 'Cum funcționează o pompă de căldură aer-aer, când se potrivește, ce presupune montajul și cum compari ofertele.',
  sinonime: ['pompa de caldura aer aer', 'pompa caldura aer aer', 'pompe de caldura aer aer', 'pompa de caldura aer aer pret'],
  intrebari: [
    'Ce este o pompă de căldură aer-aer? | Un aparat care preia căldură din aerul exterior și o cedează aerului din interior, iar vara poate funcționa invers. Constructiv este asemănător unui aparat de aer condiționat reversibil, dar este gândit pentru încălzire ca funcție principală.',
    'Prin ce diferă de un aer condiționat? | Principiul este același. Diferențele țin de modelul ales, de funcționarea la temperaturi exterioare scăzute și de rolul urmărit: încălzire principală sau doar confort în sezon. Datele sunt în fișa tehnică; discută cu un specialist.',
    'Poate încălzi singură casa? | Depinde de casă (izolație, suprafață), de climă și de modelul ales. Pentru locuințe bine izolate poate acoperi încălzirea, iar în altele se completează cu altă sursă. Un specialist face calculul pe locuința ta.',
    'Funcționează la temperaturi foarte scăzute? | Modelele au limite de funcționare și un randament care scade odată cu temperatura exterioară; valorile exacte sunt în fișa tehnică a aparatului. Întreabă firma ce se întâmplă la cele mai reci zile din zona ta.',
    'Pompa aer-aer încălzește și apa caldă? | Nu. Aerul din încăperi este încălzit direct, iar apa caldă menajeră are nevoie de altă sursă. Pentru încălzire în pardoseală sau calorifere, pompa se alege de alt tip, aer-apă.',
    'Se poate monta într-un apartament? | Se poate în multe situații, dar unitatea exterioară cere un loc potrivit și, în bloc, de regulă acordul asociației. Verifică regulile imobilului înainte de a comanda.',
    'Cât costă o pompă de căldură aer-aer? | Depinde de puterea și numărul de unități, de modelul ales, de lungimea traseului, de accesul la locul unității exterioare și de lucrările auxiliare. Cere oferte pe conținut; pentru repere vezi pagina de prețuri pentru montajul aerului condiționat.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Pompă de căldură aer-aer: alegere și montaj', subtitle: 'Cum funcționează, când se potrivește și ce implică montajul. Primești oferte gratuite de la firme din zona ta.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Principiu', value: 'Preia căldura din aerul exterior' },
      { label: 'Funcții', value: 'Încălzire și răcire' },
      { label: 'Nu face', value: 'Apă caldă menajeră' },
      { label: 'Costul depinde de', value: 'Putere, unități, montaj' },
    ] }),
    node('intro', 'text', { body: para(
      'O pompă de căldură aer-aer încălzește locuința folosind căldura din aerul de afară, cu un consum de energie electrică mai mic decât cel al unei încălziri electrice directe. Vara, același aparat poate răci încăperile. Este o soluție folosită la case și apartamente, singură sau ca ajutor pentru altă sursă de încălzire.',
      'Mai jos găsești cum funcționează, când se potrivește, ce înseamnă montajul și cum compari ofertele.',
    ) }),
    node('what-h', 'heading', { text: 'Cum funcționează', level: 'h2' }),
    node('what', 'text', { body: para(
      'Un circuit frigorific preia căldură din aerul exterior la unitatea exterioară și o cedează în interior, la unitatea interioară, care suflă aerul încălzit în cameră. Ciclul se inversează pentru răcire. Pompa mută căldura, nu o produce prin ardere sau rezistență, de aceea poate livra mai multă căldură decât energia electrică consumată.',
      'Randamentul scade când temperatura de afară coboară, iar modelele diferă mult în această privință. Informațiile sunt în fișa tehnică a aparatului.',
    ) }),
    node('where-h', 'heading', { text: 'Când se potrivește', level: 'h2' }),
    node('where', 'cards', { columns: '2', items: [
      { title: 'Case bine izolate', text: 'Necesarul de căldură este mic, iar pompa poate acoperi încălzirea sau o mare parte din ea.' },
      { title: 'Locuințe fără instalație de încălzire cu apă', text: 'Se evită calorifere sau încălzire în pardoseală; încălzirea se face direct prin aer.' },
      { title: 'Completarea altei surse', text: 'Pompa preia sarcina în sezonul de tranziție, iar sursa principală intervine în zilele cele mai reci.' },
      { title: 'Cameră sau etaj izolat', text: 'Pentru o mansardă, o anexă sau un birou, unde nu merită extinsă instalația existentă.' },
    ] }),
    node('mat-h', 'heading', { text: 'Soluții și alegere', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Se aleg mai multe criterii: puterea față de necesarul de căldură al locuinței, tipul de unități interioare (pe perete, pe pardoseală, în tavan), un singur aparat pentru o încăpere sau un sistem multisplit pentru mai multe, funcționarea la temperaturi scăzute și nivelul de zgomot.',
      'Dimensionarea o face un specialist pe baza suprafeței, a izolației, a zonei climatice și a obiceiurilor tale. Un aparat prea mic nu ține pasul în zilele reci, iar unul prea mare pornește și se oprește des și nu are randament bun.',
      'Montajul seamănă cu cel al unui aparat de aer condiționat; vezi situația dedicată, cu lucrările și ordinea lor.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Calculul necesarului', text: 'Se estimează necesarul de căldură al locuinței și se aleg puterea și numărul de unități.' },
      { title: 'Alegerea locurilor', text: 'Se stabilesc locul unităților interioare și al celei exterioare, plus traseul dintre ele.' },
      { title: 'Montajul unităților și al trasei', text: 'Fixarea unităților, trasa frigorifică, cablul și scurgerea condensului.' },
      { title: 'Verificarea circuitului', text: 'Probe de etanșeitate și vidare, executate de personal calificat.' },
      { title: 'Punerea în funcțiune', text: 'Reglaje, probă de încălzire și răcire, verificarea scurgerii.' },
      { title: 'Instruirea și documentele', text: 'Primești explicații despre utilizare și actele aparatului.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Alegerea după aparență sau preț', text: 'Ignorând puterea reală necesară și comportarea la temperaturi scăzute.' },
      { title: 'Așteptări greșite', text: 'Pompa aer-aer nu face apă caldă și nu înlocuiește automat orice altă sursă.' },
      { title: 'Subdimensionare sau supradimensionare', text: 'Ambele scad confortul și randamentul.' },
      { title: 'Unitate exterioară prost plasată', text: 'Blocată de zăpadă, frunze sau obstacole, își pierde performanța; în plus, zgomotul poate deranja.' },
      { title: 'Distribuție inegală a aerului', text: 'Unitatea interioară trebuie amplasată ca aerul cald să ajungă în zonele de stat.' },
      { title: 'Neîntreținerea filtrelor', text: 'Filtrele murdare scad randamentul și calitatea aerului.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de puterea și numărul de unități, de modelul ales, de lungimea traseului, de felul peretelui, de accesul la locul unității exterioare și de eventualele lucrări auxiliare (consolă, mascarea traseului, circuit electric). Contează și costul de funcționare: consumul depinde de randamentul modelului, de izolația casei și de clima zonei.',
      'Pentru repere de preț, vezi pagina de prețuri pentru montajul aerului condiționat.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Cere să afli cum a fost calculat necesarul de căldură, ce model se propune și de ce, ce include montajul (materiale, trasă, punere în funcțiune) și ce garanție se oferă pentru aparat și pentru lucrare. Compară oferte care pornesc de la același necesar de căldură, nu doar de la aceeași putere nominală.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi o firmă', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Alege o firmă care analizează locuința înainte de ofertă, îți explică limitele aparatului la frig și lucrează cu personal calificat și autorizat pentru circuitul frigorific. Cere oferta în scris, cu ce este inclus, și întreabă cine face service-ul pe durata utilizării.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre pompa de căldură aer-aer' }),
    node('prices', 'price_links', { title: 'Prețuri pentru climatizare' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la climatizare' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca pompa să fie montată de o firmă?', text: 'Descrie locuința și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
