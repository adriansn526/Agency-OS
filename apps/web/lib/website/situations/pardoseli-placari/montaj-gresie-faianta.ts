import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const montajGresieFaianta: SituationContent = {
  slug: 'pardoseli-placari--montaj-gresie-faianta',
  categorie: 'pardoseli-placari',
  title: 'Montaj gresie și faianță: ordine, rosturi și manoperă',
  seoTitle: 'Montaj gresie și faianță: ordine, rosturi, manoperă',
  seoDescription: 'Montaj gresie și faianță: de unde se începe, formate mari, rosturi, adeziv și greșeli frecvente. Vezi de ce depinde manopera și cum compari ofertele.',
  summary: 'De unde se începe montajul gresiei și al faianței, cum se tratează formatele mari și montajul fără rosturi vizibile, de ce depinde manopera și cum compari ofertele.',
  sinonime: ['montaj gresie', 'pret montaj gresie', 'montaj gresie 120x60', 'montaj gresie fara rosturi', 'montaj faianta', 'montaj gresie si faianta baie pret', 'de unde se incepe montarea gresiei'],
  intrebari: [
    'De unde se începe montarea gresiei? | De obicei se trasează încăperea și se începe dintr-un punct ales ca rândurile tăiate să nu cadă în locurile cele mai vizibile, adesea de la ușa de intrare sau de la axa încăperii. Se face o probă la uscat înainte de a lipi.',
    'Se montează întâi gresia sau faianța? | Depinde de lucrare și de finisaj; într-o baie ordinea e stabilită de la început cu meșterul, iar înaintea oricăreia se face hidroizolația. Fixează ordinea înainte să înceapă lucrarea.',
    'Ce special are un format mare, de tip 120x60? | Plăcile mari cer o suprafață foarte plană, adeziv potrivit aplicat pe spate și pe suport (dublu încleiere) și manevrare atentă. Tăierile și transportul sunt mai greu de făcut, iar manopera diferă față de formatele mici.',
    'Se poate monta gresia fără rosturi? | Rostul nu dispare complet: plăcile rectificate se pot monta cu rost foarte îngust, dar rostul trebuie să existe pentru dilatare și toleranțe. Un montaj lipit total poate crăpa. Cere meșterului soluția potrivită plăcii alese.',
    'Ce adeziv se folosește? | Se alege după tipul plăcii, după format, după suport și după locul lucrării (interior, exterior, încăpere umedă). Fișa tehnică a adezivului dă răspunsul; nu folosi același produs pentru orice.',
    'Este nevoie de hidroizolație în baie? | Da. Hidroizolația se face înainte de gresie și faianță. Pe larg, în pagina dedicată hidroizolației băii.',
    'Cât costă montajul gresiei? | Depinde de format, de pregătirea suportului, de tăieri și de complexitatea încăperii. Vezi pagina de preț pentru manoperă și cere oferte pe lucrări, cu detaliile incluse.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Montaj gresie și faianță', subtitle: 'De unde se începe, cum se tratează formatele mari și rosturile, ce adeziv se alege și ce intră în manoperă. Dacă preferi să o facă o firmă, ceri oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Trasare și probă la uscat' },
      { label: 'Suport', value: 'Plan, solid, curat' },
      { label: 'În baie', value: 'Hidroizolație înainte' },
      { label: 'Format mare', value: 'Adeziv pe placă și pe suport' },
    ] }),
    node('intro', 'text', { body: para(
      'Gresia se montează pe pardoseli și faianța pe pereți, dar principiile sunt aceleași: suport pregătit, adeziv potrivit, trasare corectă și rosturi respectate. O placă bună, pusă prost, arată prost; diferența se vede la plane, la rosturi și la tăieri.',
      'În băi și bucătării, înaintea plăcilor apar și pași care nu se văd: hidroizolația și, în baie, panta spre scurgere.',
    ) }),
    node('where-h', 'heading', { text: 'Unde se aplică', level: 'h2' }),
    node('where', 'cards', { columns: '2', items: [
      { title: 'Băi', text: 'Gresie pe pardoseală, faianță pe pereți; cere hidroizolație sub plăci și pantă spre scurgere.' },
      { title: 'Bucătării', text: 'Gresie pe pardoseală, faianță între blat și corpuri; rosturile se aleg ușor de curățat.' },
      { title: 'Holuri și camere de zi', text: 'Suprafețe mari, cu rosturi vizibile; trasarea contează mult.' },
      { title: 'Terase și balcoane', text: 'Plăci și adezivi pentru exterior, pante, rosturi de dilatare; cere soluții declarate pentru exterior.' },
    ] }),
    node('mat-h', 'heading', { text: 'Materiale și soluții', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Montajul folosește adeziv pentru plăci, mortar de rostuit, distanțiere și, în încăperi umede, hidroizolație și bandă de etanșare. La plăcile de format mare se folosesc adezivi special destinați, iar la cele mari sau grele uneori sisteme de nivelare.',
      'Rostul îngust pe plăci rectificate dă un aspect aproape continuu, dar rămâne necesar. Rosturile de dilatare din pardoseală și cele de la perete nu se acoperă cu mortar rigid; se umplu cu produs elastic.',
    ) }),
    node('steps', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Verificarea suportului', text: 'Planeitate, curățenie, rezistență. Șapa neplană se corectează înainte; în baie se face hidroizolația și se verifică panta.' },
      { title: 'Trasarea și proba la uscat', text: 'Se stabilește punctul de pornire și se aranjează plăcile fără adeziv, ca tăieturile să nu cadă în locuri vizibile.' },
      { title: 'Amorsa, dacă o cere produsul', text: 'Suportul se pregătește conform fișei adezivului.' },
      { title: 'Aplicarea adezivului', text: 'Cu drișca dințată potrivită formatului; la plăcile mari se aplică și pe spatele plăcii, pentru acoperire completă.' },
      { title: 'Așezarea plăcilor', text: 'Cu distanțiere și verificare permanentă cu nivela și dreptarul, rând cu rând.' },
      { title: 'Rostuirea', text: 'După priza adezivului, în timpul indicat de producător; la final se curăță pelicula de mortar.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Goluri sub plăci', text: 'Acoperirea incompletă cu adeziv face plăcile să sune a gol și să crape sub încărcare.' },
      { title: 'Lipsa probei la uscat', text: 'Rezultă tăieturi inestetice la ușă sau la perete și rânduri înguste la margine.' },
      { title: 'Adeziv nepotrivit', text: 'Un adeziv obișnuit sub plăci mari sau în exterior se desprinde.' },
      { title: 'Rosturi prea înguste sau lipsă', text: 'Fără rosturi de dilatare, plăcile se ridică sau crapă.' },
      { title: 'Hidroizolație omisă în baie', text: 'Se vede târziu, la vecinul de jos; vezi pagina despre hidroizolația băii.' },
      { title: 'Suport neplan', text: 'Diferențele de nivel între plăci apar la formate mari și sunt greu de corectat.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Manopera depinde de format (plăcile mari și cele cu design special cer mai mult timp), de numărul de tăieri, de pregătirea suportului, de complexitatea încăperii (nișe, colțuri, scurgeri) și de ce înseamnă pregătirea: demolarea plăcilor vechi, nivelarea, hidroizolația. Montajul în model sau în diagonală se plătește altfel decât cel drept.',
      'Pentru repere vezi pagina de preț a manoperei la gresie și faianță, apoi cere oferte pe lucrări.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Compară ce conține fiecare ofertă: demontarea, nivelarea, hidroizolația, adezivul, rostuirea, găurile pentru instalații, decuparea plăcilor mari, evacuarea molozului. Un preț pe metru pătrat fără aceste detalii nu se poate compara. Întreabă ce adeziv se folosește și cum se verifică planeitatea.',
    ) }),
    node('firm-h', 'heading', { text: 'Cum alegi o firmă', level: 'h2' }),
    node('firm', 'text', { body: para(
      'Cere lucrări făcute, mai ales cu formatul pe care îl ai, și cere să se vadă cum sunt rezolvate colțurile, nișele și trecerile prin placări. O echipă atentă verifică suportul, face proba la uscat și îți spune dinainte unde apar tăieturi.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre montajul gresiei și al faianței' }),
    node('prices', 'price_links', { title: 'Prețuri pentru pardoseli și placări' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la pardoseli și placări' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie încăperea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
