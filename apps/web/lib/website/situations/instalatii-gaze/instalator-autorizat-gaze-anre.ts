import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const instalatorAutorizatGazeAnre: SituationContent = {
  slug: 'instalatii-gaze--instalator-autorizat-gaze-anre',
  categorie: 'instalatii-gaze',
  title: 'Instalator autorizat ANRE pentru gaze',
  seoTitle: 'Instalator autorizat ANRE pentru gaze: cum alegi',
  seoDescription: 'Cine poate lucra la instalații de gaze, ce înseamnă autorizarea ANRE, cum verifici firma pe lista oficială, ce întrebi la ofertă și de ce depinde costul lucrării.',
  summary: 'Ce înseamnă un instalator autorizat ANRE pentru gaze, cum verifici firma pe lista oficială și ce lucrări nu se fac fără autorizare.',
  sinonime: ['firme autorizate anre gaze', 'lista firme autorizate anre gaze', 'lista instalatori autorizati gaze anre', 'firme autorizate anre gaz', 'instalator autorizat gaze', 'instalator gaze autorizat', 'instalator autorizat anre', 'instalare gaze', 'instalatii gaze', 'instalații gaze', 'listă firme autorizate anre gaze', 'listă instalatori autorizați gaze anre'],
  intrebari: [
    'Ce înseamnă „autorizat ANRE” la gaze? | Înseamnă că firma sau persoana a fost autorizată de autoritatea de reglementare să proiecteze, să execute sau să verifice instalații de gaze. Fără această autorizare, lucrarea nu se face legal și documentele nu sunt recunoscute.',
    'Unde verific dacă o firmă este autorizată? | Pe site-ul ANRE, în listele oficiale ale firmelor și persoanelor autorizate. Cere firmei datele de autorizare și caută-le acolo înainte să semnezi. Nu te baza doar pe un certificat arătat pe telefon.',
    'Ce lucrări cer personal autorizat? | Orice intervenție la instalația de gaze: montaj, modificare, mutare de aparat, schimbare de conductă sau de racord, revizie, verificare, punere în funcțiune. Dacă nu ești sigur, întreabă distribuitorul sau o firmă autorizată înainte de a atinge ceva.',
    'Instalatorul de apă și căldură poate lucra și la gaze? | Doar dacă are autorizarea pentru gaze, valabilă pentru tipul de lucrare. Autorizarea este separată de meseria în sine. Verifică-o la fel ca la orice firmă.',
    'Cine face racordarea la rețeaua de gaze? | Racordarea la rețea o face operatorul de distribuție sau o firmă pe care acesta o acceptă. Instalația din interiorul casei o face o firmă autorizată, iar punerea în funcțiune urmează procedura distribuitorului. Detaliile se verifică la distribuitor.',
    'Ce documente primesc de la instalator? | Ofertă și contract, apoi documentele lucrării și ale verificărilor, conform procedurii. Păstrează-le pentru distribuitor, pentru reviziile viitoare și pentru eventuale garanții de aparat.',
    'De ce depinde costul unei instalări? | De tipul lucrării, de lungimea traseului, de numărul de aparate, de starea instalației existente și de pașii impuși de distribuitor. Cere ofertă scrisă și vezi paginile de preț de mai jos.',
    'Mă pot baza pe un recomandat de cunoștințe? | Un recomandat poate fi un bun punct de plecare, dar autorizarea se verifică oricum pe lista oficială. Un prieten nu garantează documentele sau competența pentru lucrarea ta.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Instalator autorizat ANRE pentru gaze: cum alegi și cum verifici', subtitle: 'Lucrările la gaze se fac doar de personal autorizat. Vezi ce înseamnă autorizarea, cum o verifici pe lista oficială și cum compari ofertele.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine lucrează', value: 'Firmă sau persoană autorizată' },
      { label: 'Verificare', value: 'Lista oficială de pe site-ul ANRE' },
      { label: 'Nu se face singur', value: 'Orice intervenție la instalația de gaze' },
      { label: 'Primești', value: 'Ofertă, contract și documente' },
    ] }),
    node('intro', 'text', { body: para(
      'Gazul este un domeniu în care greșelile au consecințe grave, de aceea lucrările sunt rezervate firmelor și persoanelor autorizate de ANRE. Pentru proprietar, întrebarea practică este cum găsește una, cum își dă seama că autorizarea este reală și ce înseamnă ea pentru lucrarea lui.',
      'Pagina explică acești pași. Nu publicăm o listă de nume: lista oficială și actualizată se consultă pe site-ul ANRE, iar noi te ajutăm să vezi ce întrebi și ce cauți într-o ofertă.',
    ) }),
    node('what-h', 'heading', { text: 'Ce poate face un instalator autorizat', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Execuție de instalații noi', text: 'Conducte, robinete și racorduri la aparate într-o casă sau un apartament, după un proiect sau o soluție aprobată.' },
      { title: 'Modificări și mutări', text: 'Mutarea unui aparat, extinderea unei conducte sau schimbarea unui racord.' },
      { title: 'Verificare și revizie', text: 'Controlul instalației existente și emiterea documentelor corespunzătoare.' },
      { title: 'Punerea în funcțiune', text: 'Pașii finali înainte de utilizare, în procedura impusă de distribuitor.' },
    ] }),
    node('where-h', 'heading', { text: 'Cum verifici autorizarea', level: 'h2' }),
    node('where', 'text', { body: para(
      'Cere firmei datele de autorizare, apoi caută-le în listele oficiale de pe site-ul ANRE. Verifică dacă autorizarea acoperă tipul de lucrare dorit, pentru că autorizările diferă după tipul de activitate. Dacă ceva nu se potrivește, cere lămuriri sau schimbă firma.',
      'La clădiri cu mai multe apartamente, orice lucrare care atinge o parte comună se discută cu asociația și cu distribuitorul. Pentru racordarea la rețea, procedura o stabilește distribuitorul din zona ta.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine decurge lucrarea', items: [
      { title: 'Lămurești ce vrei', text: 'Instalație nouă, mutare de aparat, schimbare de centrală sau verificare: tipul lucrării schimbă oferta.' },
      { title: 'Verifici firmele', text: 'Alegi două sau trei și le cauți pe lista ANRE înainte să le chemi.' },
      { title: 'Vizită și ofertă', text: 'Firma vede locul, spune ce este necesar și face o ofertă scrisă cu materiale, manoperă și pași.' },
      { title: 'Contract și execuție', text: 'Se semnează contractul, apoi lucrarea se execută de personal autorizat.' },
      { title: 'Verificări și documente', text: 'Controlul final, documentele și, dacă e cazul, punerea în funcțiune prin distribuitor.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Lucrare cu „un cunoscut care se pricepe”', text: 'Fără autorizare, documentele nu sunt valabile și riscul rămâne al tău.' },
      { title: 'Neverificarea listei', text: 'Un certificat arătat fugitiv nu e dovadă; verifică pe site-ul oficial.' },
      { title: 'Autorizare pentru altceva', text: 'Firma poate fi autorizată pentru un domeniu, dar nu pentru lucrarea ta.' },
      { title: 'Lipsa contractului', text: 'Promisiunile verbale nu ajută dacă apar probleme.' },
      { title: 'Ocolirea distribuitorului', text: 'Racordarea sau punerea în funcțiune fără pașii impuși nu este acceptată.' },
      { title: 'Alegere doar după preț', text: 'Oferta mică poate omite materiale, teste sau documente.' },
    ] }),
    node('safety-h', 'heading', { text: 'Dacă simți miros de gaz', level: 'h2' }),
    node('safety', 'text', { body: para(
      'Ieși din locuință, aerisește, nu aprinde nimic și sună de afară la urgențe sau la distribuitor. Nu chema întâi un instalator și nu încerca să repari singur. Regula este generală; urmează și indicațiile distribuitorului.',
    ) }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Prețul depinde de tipul lucrării, de lungimea traseului, de numărul de aparate, de starea instalației existente, de materiale și de pașii administrativi. O mutare simplă de aparat și o instalație nouă într-o casă sunt lucrări diferite.',
      'Cere oferte scrise care separă materialele de manoperă. Pentru ordin de mărime, vezi paginile de preț de mai jos.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Compară ce materiale sunt incluse, ce teste se fac, ce documente primești, cine se ocupă de legătura cu distribuitorul și în ce condiții se plătește. Oferta clară pe aceste puncte valorează mai mult decât una scurtă și vagă.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Pe lângă autorizarea verificată, caută o firmă care explică pașii, vine la fața locului și dă contract. Întreabă ce lucrări similare a făcut și cum rezolvă garanția. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre instalatorii autorizați' }),
    node('prices', 'price_links', { title: 'Prețuri pentru instalații de gaze' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la instalații de gaze' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Cauți o firmă pentru instalația de gaze?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
