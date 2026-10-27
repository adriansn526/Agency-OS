import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const montajAerConditionat: SituationContent = {
  slug: 'climatizare--montaj-aer-conditionat',
  categorie: 'climatizare',
  title: 'Montaj aer condiționat: cine îl face, ce include și de ce depinde prețul',
  seoTitle: 'Montaj aer condiționat: ce include și cum alegi firma',
  seoDescription: 'Montajul aerului condiționat: ce include lucrarea, unde se montează unitățile, în ce ordine se lucrează, greșelile frecvente și cum compari ofertele.',
  summary: 'Ce include montajul unui aparat de aer condiționat, cum se alege locul unităților, în ce ordine se lucrează și cum compari ofertele firmelor.',
  sinonime: ['montaj aer conditionat', 'instalare aer conditionat', 'instalari aer conditionat', 'montare aer conditionat', 'montaj aer conditionat pret', 'pret montaj aer conditionat', 'pret montare aer conditionat', 'instalator aer conditionat', 'aer conditionat cu montaj'],
  intrebari: [
    'Ce include montajul unui aer condiționat? | De regulă fixarea unității interioare și a celei exterioare, trasa dintre ele (conducte, cablu, scurgere pentru condens), probele de etanșeitate, punerea în funcțiune și explicarea utilizării. Ce intră exact diferă de la firmă la firmă, așa că cere lista în ofertă.',
    'Pot monta singur aparatul? | Fixarea mecanică o pot face și alte persoane, dar legarea circuitului frigorific și punerea în funcțiune cer personal calificat și autorizat. O montare incorectă poate duce la pierderi de agent frigorific, funcționare slabă și pierderea garanției producătorului.',
    'Unde se montează unitatea interioară? | Într-un loc cu perete solid, la distanță suficientă de tavan și de mobilă, astfel încât aerul să circule liber și să nu bată direct spre locul în care stai sau dormi. Distanțele minime sunt în instrucțiunile aparatului.',
    'Unde se montează unitatea exterioară? | Pe fațadă, pe console sau pe balcon, într-un loc accesibil pentru service și cu aerisire bună. În bloc, verifică dacă asociația de proprietari cere acord sau un anumit loc pentru unitățile exterioare.',
    'Cât durează montajul? | Depinde de lungimea traseului, de felul peretelui și de dificultatea accesului la locul unității exterioare. Pentru un montaj obișnuit, firma îți poate spune un interval după ce vede locul sau pe baza unor poze.',
    'Ce documente primesc după montaj? | De obicei un act de punere în funcțiune sau o fișă de montaj, certificatul de garanție al aparatului și, dacă firma oferă, garanția pentru lucrare. Păstrează-le: garanția producătorului poate depinde de un montaj făcut de firmă autorizată.',
    'Cât costă montajul unui aer condiționat? | Depinde de lungimea traseului dintre unități, de felul și grosimea peretelui, de accesul la unitatea exterioară, de materialele incluse și de câte unități montezi. Compară ofertele pe conținut și vezi pagina de prețuri pentru montajul aerului condiționat.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Montaj aer condiționat: ce include și cum alegi firma', subtitle: 'Ce cuprinde lucrarea, unde se montează unitățile și cum compari ofertele. Primești oferte gratuite de la firme din zona ta.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Unități', value: 'Interioară și exterioară' },
      { label: 'Legătura dintre ele', value: 'Trasă frigorifică, cablu, scurgere' },
      { label: 'Punere în funcțiune', value: 'De personal calificat' },
      { label: 'Costul depinde de', value: 'Traseu, perete, acces' },
    ] }),
    node('intro', 'text', { body: para(
      'Un aparat de aer condiționat funcționează bine doar dacă este montat corect: locul unităților, lungimea și etanșeitatea traseului dintre ele și scurgerea condensului contează cel puțin cât aparatul în sine. Un montaj slab se simte în zgomot, în pete de apă pe perete și în funcționare ineficientă.',
      'Pagina te ajută să înțelegi ce cuprinde o lucrare de montaj, ce întrebi o firmă și cum citești ofertele, ca să poți compara variante echivalente.',
    ) }),
    node('what-h', 'heading', { text: 'Ce este montajul și ce cuprinde', level: 'h2' }),
    node('what', 'text', { body: para(
      'Montajul înseamnă instalarea unității interioare pe perete și a celei exterioare în afara clădirii, legarea lor printr-o trasă frigorifică (două conducte izolate), un cablu de alimentare și comandă și un furtun pentru scurgerea condensului. Urmează verificarea etanșeității circuitului, golirea de aer și umezeală din conducte și punerea în funcțiune.',
      'Firma ar trebui să-ți spună ce materiale sunt incluse (conducte, izolație, console, canal de protecție, cablu) și ce se facturează separat, de exemplu o trasă mai lungă decât cea standard, străpungeri speciale sau lucrări la înălțime.',
    ) }),
    node('where-h', 'heading', { text: 'Unde se montează unitățile', level: 'h2' }),
    node('where', 'cards', { columns: '2', items: [
      { title: 'Unitatea interioară', text: 'Pe un perete solid, cu spațiu liber în jur, astfel încât aerul să nu bată direct în pat sau la birou și să nu fie blocat de mobilă sau perdele.' },
      { title: 'Unitatea exterioară', text: 'Pe fațadă, console sau balcon, cu aerisire liberă și acces pentru service. Evită locurile în care zgomotul deranjează vecinii sau dormitorul.' },
      { title: 'Traseul dintre unități', text: 'Cât mai scurt și cât mai drept; fiecare cot și metru în plus afectează funcționarea și crește lucrarea.' },
      { title: 'Scurgerea condensului', text: 'Cu pantă continuă spre exterior sau spre o scurgere; o scurgere montată greșit duce la apă pe perete.' },
    ] }),
    node('mat-h', 'heading', { text: 'Soluții de montaj', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Cel mai des se montează aparate de tip split, cu o unitate interioară și una exterioară. Pentru mai multe încăperi există sisteme multisplit (mai multe unități interioare legate la o singură unitate exterioară), iar pentru spații mari sau cu tavan fals, unități de alte tipuri, montate pe tavan, în tavan sau pe pardoseală.',
      'Traseul poate fi aparent, în canal de protecție, sau mascat în perete ori în tavan fals, dacă se decide din timp, înainte de finisaje. Mascarea traseului dă un aspect mai curat, dar cere lucrări suplimentare și face mai grea orice intervenție ulterioară.',
      'Dimensionarea aparatului după încăpere (suprafață, expunere la soare, număr de persoane, aparate care degajă căldură) o face un specialist; nu alege doar după recomandarea unui vecin.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Vizita sau analiza locului', text: 'Se stabilesc locul unităților, traseul, felul peretelui și accesul la unitatea exterioară.' },
      { title: 'Fixarea unităților', text: 'Se montează placa de prindere a unității interioare și consolele celei exterioare, bine ancorate în perete.' },
      { title: 'Străpungerea și trasa', text: 'Se face trecerea prin perete și se trag conducta frigorifică, cablul și furtunul de condens, cu izolație continuă.' },
      { title: 'Legarea circuitului', text: 'Racordurile se execută cu unelte potrivite, de personal calificat.' },
      { title: 'Probe de etanșeitate și vidare', text: 'Se verifică etanșeitatea și se elimină aerul și umezeala din circuit înainte de a deschide agentul frigorific.' },
      { title: 'Punerea în funcțiune', text: 'Se pornește aparatul, se verifică funcționarea și scurgerea condensului și ți se explică utilizarea.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente la montaj', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Lipsa vidării circuitului', text: 'Aerul și umezeala rămase în instalație scad performanța și pot strica compresorul în timp.' },
      { title: 'Scurgere fără pantă', text: 'Condensul stagnează sau se întoarce în aparat și apar pete și mirosuri.' },
      { title: 'Izolație întreruptă pe trasă', text: 'Conductele neizolate pe porțiuni produc condens și pierderi.' },
      { title: 'Unitate exterioară slab fixată', text: 'Vibrații, zgomot și risc de desprindere; consolele și ancorele trebuie potrivite cu tipul de perete.' },
      { title: 'Locul ales doar pentru estetică', text: 'Curentul de aer direct pe pat sau birou sau aerisirea blocată strică confortul.' },
      { title: 'Montaj fără documente', text: 'Fără act de punere în funcțiune poți avea probleme la garanție.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Prețul montajului depinde de lungimea traseului dintre unități, de felul și grosimea peretelui, de accesul la locul unității exterioare (înălțime, schelă sau platformă), de materialele incluse în ofertă, de mascarea traseului și de numărul de unități. Montajul mai multor aparate în aceeași lucrare este adesea oferit mai avantajos decât montaje separate, dar întreabă firma.',
      'Aparatul și montajul se pot cumpăra împreună sau separat; în ambele cazuri cere o ofertă în care să vezi ce este inclus. Pentru repere, vezi pagina de prețuri pentru montajul aerului condiționat.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Compară ofertele pe conținut: ce lungime de trasă este inclusă, ce materiale, dacă se face vidarea, dacă oferta include punerea în funcțiune și actele, ce se plătește în plus și ce garanție dă firma pentru lucrare. O ofertă mult mai mică lasă de obicei deoparte unul dintre acești pași.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi o firmă', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Întreabă dacă personalul care leagă circuitul frigorific este calificat și autorizat pentru lucrul cu agenți frigorifici, cere să vezi lucrări făcute și cere oferta în scris, cu ce este inclus. Verifică dacă poate emite actele de punere în funcțiune. Diferențele mari între firme se văd în detalii: izolația traselor, fixarea consolelor, ordinea lucrului.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre montajul aerului condiționat' }),
    node('prices', 'price_links', { title: 'Prețuri pentru climatizare' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la climatizare' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca montajul să-l facă o firmă?', text: 'Descrie locuința și aparatul dorit și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
