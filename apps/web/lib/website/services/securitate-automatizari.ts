import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "securitate și automatizări": it presents the situations and sends to the guides and price pages (blocks that fill
 * themselves with what is published). No price table of its own.
 */
export const securitateAutomatizari: ServiceContent = {
  slug: 'securitate-automatizari',
  hub: true,
  seoTitle: 'Securitate și automatizări: camere, interfon, alarmă',
  seoDescription: 'Securitate și automatizări pentru casă și apartament: camere, interfon, alarmă și casă inteligentă. Ce reguli se aplică, cum alegi și cum compari ofertele.',
  summary: 'Camere video, interfon, alarmă și casă inteligentă: ce soluții există, ce reguli privesc viața privată și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Ce cuprind sistemele de securitate pentru locuință? | În general camere video, interfon sau videointerfon, control de acces, alarmă antiefracție și dispozitive de casă inteligentă. Se pot folosi separat sau legate între ele; alegerea pornește de la ce vrei să protejezi.',
    'Cu ce încep: cameră, alarmă sau interfon? | Începe cu riscul pe care vrei să-l reduci. Accesul la intrare se rezolvă cu interfon sau control de acces, urmărirea cu camere, iar protecția în lipsa ta cu alarmă. Un instalator te poate ajuta să alegi o combinație potrivită.',
    'Ce reguli se aplică camerelor video? | Imaginile cu persoane sunt date personale, deci contează scopul, informarea persoanelor și păstrarea în siguranță. Camerele pe spații comune sau îndreptate spre vecini cer acordul celor implicați. Verifică regulile la autoritatea de protecție a datelor sau la un jurist.',
    'Am nevoie de acordul asociației? | Pentru interfon, control de acces sau camere pe spațiile comune ale unui bloc, da, de regulă. Întreabă administratorul înainte de comandă.',
    'Cine face montajul? | O firmă de sisteme de securitate. Când lucrarea atinge rețeaua electrică (circuite noi, tablou, alimentare fixă), partea electrică o face un electrician autorizat.',
    'Pot instala singur dispozitive smart? | Cele pe baterii sau cu alimentare prin priză, da, după instrucțiunile producătorului. Orice conexiune fixă sau intervenție în tablou o face electricianul. Schimbă parolele și actualizează aparatele.',
    'Cum compar ofertele? | Pe conținut: câte dispozitive, ce tip de înregistrare sau comunicare, cine configurează, ce garanție și ce service. Cere ofertă scrisă care separă echipamentul de manoperă. Paginile de prețuri de mai jos explică factorii.',
    'Cât de sigure sunt sistemele conectate la internet? | Sunt la fel de sigure cât le faci tu și instalatorul: parole proprii, actualizări, acces limitat. Un sistem lăsat cu setările din fabrică poate fi accesat de persoane neautorizate.',
  ],
  sinonime: ['securitate', 'securitate locuință', 'sisteme de securitate', 'automatizări casă', 'automatizare', 'securitate casă'],
  blocks: [
    node('hero', 'hero', { title: 'Securitate și automatizări', subtitle: 'Camere, interfon, alarmă și casă inteligentă: ce soluții există și cum compari ofertele. Descrie ce ai nevoie și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Ce vrei să protejezi' },
      { label: 'Reguli', value: 'Date personale, vecini, asociație' },
      { label: 'Electric', value: 'Electrician pentru tablou și circuite' },
      { label: 'Compari', value: 'Echipament, manoperă, service' },
    ] }),
    node('intro', 'text', { body: para(
      'Securitatea unei locuințe se construiește din piese care se completează: cine intră, ce se vede, ce se întâmplă când nu ești acasă. Fiecare piesă are propriile reguli, de la acordul vecinilor la instalația electrică, iar greșelile apar de obicei la compatibilitate și la reguli, nu la aparatul în sine.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Camere de supraveghere', text: 'Sisteme video pentru casă sau apartament, cu regulile privind viața privată și acordul vecinilor.' },
      { title: 'Interfon și videointerfon', text: 'Legătura dintre intrare și locuință; la bloc, partea comună se hotărăște în asociație.' },
      { title: 'Alarmă și smart home', text: 'Senzori, centrală și automatizări; ce poți face singur și ce cere un electrician.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Securitate și automatizări pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre securitate și automatizări' }),
    node('prices', 'price_links', { title: 'Prețuri pentru securitate și automatizări' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Ce vrei să protejezi', text: 'Faci o listă simplă: intrări, zone, riscuri. Firma pornește de la ea.' },
      { title: 'Reguli și acorduri', text: 'Verifici regulile pentru camere și, la bloc, discuți în asociație înainte de orice lucrare pe partea comună.' },
      { title: 'Vizită și ofertă', text: 'Firma vede clădirea și face o ofertă scrisă, cu echipamente, manoperă și setări.' },
      { title: 'Montaj', text: 'Instalatorul lucrează; partea electrică o face un electrician autorizat, când e cazul.' },
      { title: 'Configurare și instruire', text: 'Se schimbă parolele implicite, se testează sistemul și înveți să-l folosești.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două oferte și compară-le pe aceleași criterii: ce echipamente sunt incluse, cine configurează accesul, ce garanție și ce service se oferă. Alege firma care vine la fața locului și te avertizează când o soluție ridică probleme de viață privată sau de compatibilitate.',
      'Întreabă cine face partea electrică și cum sunt protejate datele din sistem. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre securitate și automatizări' }),
    node('firms', 'firms_list', { title: 'Firme de securitate și automatizări', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de un sistem de securitate?', text: 'Descrie locuința și ce vrei să protejezi și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
