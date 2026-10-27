import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const reparatiiServiceAerConditionat: SituationContent = {
  slug: 'climatizare--reparatii-service-aer-conditionat',
  categorie: 'climatizare',
  title: 'Service, reparații și încărcare freon la aerul condiționat',
  seoTitle: 'Service și reparații aer condiționat, încărcare freon',
  seoDescription: 'Service și reparații la aerul condiționat: defecte frecvente, diagnostic, când se încarcă agentul frigorific, ce poți verifica singur și cum alegi o firmă.',
  summary: 'Ce defecte are des un aer condiționat, cum se face diagnosticul, când intervine încărcarea cu agent frigorific și cum compari ofertele.',
  sinonime: ['reparatii aer conditionat', 'reparații aer condiționat', 'service aer conditionat', 'revizie aer conditionat', 'incarcare freon', 'incarcat freon', 'incarcare freon aer conditionat', 'freon aer conditionat'],
  intrebari: [
    'De ce nu mai răcește aparatul? | Cauzele posibile sunt multe: filtre foarte murdare, unitate exterioară colmatată, pierdere de agent frigorific, defect electric sau al compresorului. Un diagnostic făcut de specialist arată care este cauza reală.',
    'Trebuie completat freonul periodic? | În principiu, circuitul frigorific este închis și agentul nu se consumă. Dacă nivelul scade, există de obicei o pierdere, iar simpla completare nu o rezolvă: pierderea trebuie găsită și remediată.',
    'Pot încărca singur aparatul cu freon? | Nu. Manipularea agenților frigorifici se face doar de personal calificat și autorizat, cu echipament adecvat, iar pierderile în atmosferă sunt reglementate. Cere firmei să explice ce a găsit și ce a făcut.',
    'Ce verific înainte să chem service-ul? | Dacă aparatul este alimentat și setat corect, dacă telecomanda are baterii, dacă filtrele sunt curate și dacă unitatea exterioară nu este blocată. Eventualele coduri de eroare de pe afișaj sunt explicate în manualul aparatului.',
    'De ce curge apă din unitatea interioară? | De obicei scurgerea condensului este astupată sau montată fără pantă, sau filtrele murdare provoacă îngheț și apoi dezgheț. Firma verifică scurgerea și circulația aerului.',
    'Ce este revizia? | O verificare planificată a aparatului: curățenia, starea scurgerii, etanșeitatea circuitului, funcționarea electrică și a ventilatoarelor. Frecvența recomandată o dau instrucțiunile producătorului și firma de service.',
    'Cât costă o reparație? | Depinde de defect, de piesele necesare, de accesul la unități și de cât durează diagnosticul. Cere ofertă după diagnostic, cu piesele și manopera separate, și vezi pagina de prețuri pentru climatizare.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Service, reparații și încărcare freon', subtitle: 'Ce defecte apar des, cum se face diagnosticul și când se intervine asupra circuitului frigorific. Primești oferte gratuite de la firme din zona ta.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Diagnostic' },
      { label: 'Circuit frigorific', value: 'Doar personal autorizat' },
      { label: 'Scăderea agentului', value: 'Semnalează o pierdere' },
      { label: 'Verifică singur', value: 'Filtre, alimentare, setări' },
    ] }),
    node('intro', 'text', { body: para(
      'Când un aparat de aer condiționat răcește slab, face zgomot, scurge apă sau afișează o eroare, cauza poate fi simplă (filtre murdare) sau serioasă (pierdere de agent frigorific, defect electric, compresor). Reparația corectă începe cu un diagnostic, nu cu o încărcare „la ochi”.',
      'Pagina explică defectele frecvente, ce poți verifica singur și ce rămâne în sarcina unei firme calificate, inclusiv lucrul cu agentul frigorific.',
    ) }),
    node('what-h', 'heading', { text: 'Ce înseamnă service, reparație și încărcare', level: 'h2' }),
    node('what', 'text', { body: para(
      'Service-ul sau revizia înseamnă verificarea și întreținerea aparatului. Reparația presupune remedierea unui defect: schimbarea unei piese, refacerea unei etanșări sau a unei conexiuni electrice. Încărcarea cu agent frigorific (în vorbirea curentă, „freon”) se face după ce pierderea a fost găsită și remediată, nu în locul acestei etape.',
      'Circuitul frigorific este închis: agentul nu se „consumă” ca un combustibil. Dacă lipsește agent, undeva se pierde, și o completare fără remediere duce la aceeași problemă după o vreme.',
    ) }),
    node('where-h', 'heading', { text: 'Defecte frecvente', level: 'h2' }),
    node('where', 'cards', { columns: '2', items: [
      { title: 'Răcește slab sau deloc', text: 'Filtre murdare, unitate exterioară colmatată, pierdere de agent frigorific sau defect al compresorului.' },
      { title: 'Curge apă din unitatea interioară', text: 'Scurgere astupată, pantă greșită sau îngheț urmat de dezgheț.' },
      { title: 'Zgomot sau vibrații', text: 'Ventilator dezechilibrat, console slăbite, obiecte în unitatea exterioară sau componente uzate.' },
      { title: 'Eroare pe afișaj sau nu pornește', text: 'Problemă de alimentare, senzor, placă electronică sau comunicare între unități; codul este explicat în manual.' },
    ] }),
    node('mat-h', 'heading', { text: 'Cum se face diagnosticul', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Specialistul verifică întâi lucrurile simple: alimentarea, setările, filtrele și scurgerea. Apoi urmează verificarea funcționării ventilatoarelor, a componentelor electrice, a presiunilor din circuit și, dacă se suspectează o pierdere, căutarea ei cu aparatura potrivită.',
      'Agentul frigorific se manipulează doar de personal calificat și autorizat, cu echipament și cantități stabilite pe baza fișei aparatului. Nu accepta o încărcare făcută fără să se spună unde a fost pierderea și ce s-a reparat.',
      'Pentru piese, cere să afli ce se schimbă și de ce, iar la schimbarea unei piese importante întreabă ce garanție primești.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Descrierea problemei', text: 'Spui când apare defectul, ce zgomote sau erori vezi și de când.' },
      { title: 'Verificări de bază', text: 'Alimentare, setări, filtre, scurgere, unitatea exterioară.' },
      { title: 'Diagnostic detaliat', text: 'Verificarea componentelor electrice și a circuitului frigorific, inclusiv căutarea pierderilor.' },
      { title: 'Oferta pentru remediere', text: 'Primești piesele și manopera necesare, cu explicații, înainte de începerea lucrării.' },
      { title: 'Remedierea', text: 'Se repară sau se înlocuiește componenta; dacă este cazul, se reface etanșarea și se videază circuitul.' },
      { title: 'Încărcarea și proba', text: 'Dacă e nevoie, agentul se completează de personal autorizat, apoi se verifică funcționarea.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Încărcare fără găsirea pierderii', text: 'Problema revine, iar agentul se pierde din nou.' },
      { title: 'Încercări pe cont propriu', text: 'Intervenția pe circuitul frigorific sau pe partea electrică poate fi periculoasă și strică garanția.' },
      { title: 'Amânarea reparației', text: 'Un aparat care funcționează defectuos se poate degrada mai grav.' },
      { title: 'Acceptarea unei oferte fără explicații', text: 'Cere să afli defectul găsit și ce se schimbă.' },
      { title: 'Ignorarea filtrelor și a scurgerii', text: 'Multe defecte „misterioase” se rezolvă cu o curățenie.' },
      { title: 'Lipsa documentelor', text: 'Păstrează fișa de intervenție; te ajută la garanție și la viitoare diagnostice.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul unei reparații depinde de defect, de piesele necesare, de accesul la unități, de cât durează diagnosticul și de dacă e nevoie de remedierea unei pierderi și de încărcarea circuitului. De multe ori diagnosticul se facturează separat sau se deduce din lucrare dacă accepți oferta; întreabă din start.',
      'Pentru repere de preț, vezi paginile de prețuri din categoria climatizare.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Compară ce conține oferta: diagnosticul, piesele (noi sau recondiționate), manopera, deplasarea, încărcarea cu agent frigorific și garanția pentru lucrare. Cere piesele și manopera pe rânduri separate și o explicație a cauzei defectului.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi o firmă', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Alege o firmă cu personal calificat și autorizat pentru lucrul cu agenți frigorifici, care îți explică defectul și îți dă o ofertă clară înainte de lucrare. Întreabă dacă lucrează cu marca aparatului tău și ce garanție oferă pentru piese și manoperă.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre service și reparații' }),
    node('prices', 'price_links', { title: 'Prețuri pentru climatizare' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la climatizare' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Aparatul tău are nevoie de service?', text: 'Descrie problema și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
