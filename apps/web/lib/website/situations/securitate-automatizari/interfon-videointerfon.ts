import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const interfonVideointerfon: SituationContent = {
  slug: 'securitate-automatizari--interfon-videointerfon',
  categorie: 'securitate-automatizari',
  title: 'Interfon și videointerfon',
  seoTitle: 'Interfon și videointerfon: montaj și acord asociație',
  seoDescription: 'Interfon sau videointerfon pentru apartament, bloc sau casă: soluții, ce implică montajul, acordul asociației, de ce depinde costul și cum compari ofertele.',
  summary: 'Cum alegi și montezi un interfon sau videointerfon la apartament, bloc sau casă, ce decide asociația și ce întrebi instalatorul.',
  sinonime: ['interfon', 'interfon apartament', 'interfoane apartament', 'interfon bloc', 'videointerfon', 'control acces'],
  intrebari: [
    'Care este diferența dintre interfon și videointerfon? | Interfonul permite doar conversația audio între intrare și locuință, iar videointerfonul adaugă imaginea vizitatorului. Videointerfonul cere un cablaj sau o rețea care transportă și imaginea.',
    'Pot schimba singur interfonul din apartament? | Aparatul din locuință poate fi legat la o instalație comună a blocului. De aceea schimbarea lui depinde de sistemul existent. Întreabă asociația sau firma care întreține sistemul înainte de a cumpăra ceva.',
    'Am nevoie de acordul asociației? | Pentru partea comună (panoul de la intrare, cablajul scării, încuietoarea) da, deciziile se iau la nivel de asociație sau de bloc. Pentru aparatul din apartament, depinde de tipul sistemului. Întreabă administratorul.',
    'Ce este controlul de acces? | Un sistem care decide cine intră: cu cod, cartelă, telecomandă sau aplicație. Poate fi parte din interfon sau separat. Pentru clădiri cu mai multe apartamente, se discută la nivelul asociației.',
    'Cine face montajul? | O firmă de sisteme de securitate sau de interfonie. Dacă lucrarea atinge rețeaua electrică (alimentarea panoului, branșament nou), partea electrică o face un electrician autorizat.',
    'Videointerfon cu fir sau fără fir? | Cu fir, imaginea și sunetul sunt de regulă stabile, dar cablurile trebuie trase. Fără fir, montajul e mai simplu, însă depinde de rețea și de acoperire. Alegerea se face după clădire.',
    'Se poate monta interfon la o casă? | Da, și aici sunt mai multe variante: panou la poartă, aparat în casă, comandă pentru poarta automată. Dacă poarta e automatizată, vezi și situația despre porți culisante, ca să se coordoneze lucrările.',
    'De ce depinde costul? | De tipul sistemului, de numărul de apartamente sau aparate, de cablarea existentă și de accesul la ea, de panou și de eventualele lucrări electrice. Cere ofertă detaliată.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Interfon și videointerfon: ce implică montajul și cine decide', subtitle: 'Pentru apartament, bloc sau casă: soluții, rolul asociației și ce întrebi instalatorul. Poți cere oferte gratuite de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'La bloc', value: 'Decide asociația pentru partea comună' },
      { label: 'Variante', value: 'Audio sau audio și video' },
      { label: 'Electric', value: 'Electrician acolo unde se atinge rețeaua' },
      { label: 'Oferta', value: 'Aparate, cablaj și manoperă separat' },
    ] }),
    node('intro', 'text', { body: para(
      'Interfonul face legătura dintre cine sună la intrare și cine este în locuință. Dacă adaugi imaginea, devine videointerfon. Lucrarea pare simplă, dar la bloc se complică pentru că o parte din sistem este comună: panoul de la intrare, cablajul scării și încuietoarea.',
      'Pagina explică ce se hotărăște în asociație, ce se face în apartament și ce se întreabă la ofertă. Pentru camere video, vezi situația dedicată; pentru alarme, tot pe pagina ei.',
    ) }),
    node('what-h', 'heading', { text: 'Ce soluții există', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Interfon audio', text: 'Soluție clasică, cu panou la intrare și aparat în apartament; potrivită când nu ai nevoie de imagine.' },
      { title: 'Videointerfon', text: 'Adaugă ecran și cameră în panou. Cere cablaj sau rețea care transportă imaginea.' },
      { title: 'Control acces', text: 'Cod, cartelă sau altă metodă de deschidere a ușii. Se coordonează cu asociația la bloc.' },
      { title: 'Soluții pentru casă', text: 'Panou la poartă, aparat în casă și, după caz, comandă pentru poarta automată.' },
    ] }),
    node('where-h', 'heading', { text: 'La bloc: ce hotărăște asociația', level: 'h2' }),
    node('where', 'text', { body: para(
      'Panoul de la intrarea în scară, cablajul comun și încuietoarea electromagnetică nu aparțin unui singur proprietar. Schimbarea lor se hotărăște în asociație, uneori cu acordul vecinilor din scară. Un apartament nu poate „trece pe alt sistem” fără ca blocul să fie de acord.',
      'Înainte să comanzi un aparat, întreabă administratorul ce sistem există și cine îl întreține. Un aparat incompatibil cu instalația blocului nu funcționează chiar dacă se montează corect.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Afli ce există', text: 'Vezi ce sistem are blocul sau casa și cine îl administrează.' },
      { title: 'Decizia', text: 'La bloc, discuți în asociație; la casă, decizi ce vrei: audio, video, acces.' },
      { title: 'Oferta', text: 'Firma vine la fața locului, vede cablajul și propune o soluție cu componentele necesare.' },
      { title: 'Montaj', text: 'Se montează panoul, se leagă cablurile și aparatele, de electrician acolo unde lucrarea o cere.' },
      { title: 'Test și instruire', text: 'Se verifică apelul, imaginea, deschiderea ușii și se explică utilizarea.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Aparat cumpărat fără verificare', text: 'Compatibilitatea cu sistemul existent se verifică înainte de achiziție.' },
      { title: 'Lucrare fără acordul asociației', text: 'Intervențiile în partea comună se pot opri sau se pot desface.' },
      { title: 'Cablaj lăsat la voia întâmplării', text: 'Cablurile prea vechi sau deteriorate dau probleme chiar cu aparate noi.' },
      { title: 'Alimentare improvizată', text: 'Conexiuni făcute fără electrician pot fi un risc.' },
      { title: 'Pierderea codurilor', text: 'Codurile și cartelele trebuie administrate, altfel accesul devine confuz.' },
      { title: 'Ofertă fără detalii', text: 'Un preț „la cheie” fără listă de componente nu se poate compara.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de tipul sistemului, de numărul de apartamente sau de aparate, de starea cablajului existent, de panou, de accesul la căile de cablu și de eventualele lucrări electrice. Schimbarea unui singur aparat nu seamănă cu înlocuirea întregului sistem al unui bloc.',
      'Cere oferte care enumeră componentele și spun ce se întâmplă cu cele vechi. Pentru ordin de mărime, vezi paginile de preț de mai jos.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Verifică ce intră în ofertă: panou, aparate, cablaj, încuietoare, alimentare, manoperă, testarea. Întreabă ce garanție și ce service se oferă și cine administrează codurile după montaj.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Alege o firmă care a lucrat la sisteme asemănătoare, vine să vadă cablajul și poate explica asociației ce propune. Cere o ofertă scrisă pe care s-o poți arăta administratorului.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre interfon și videointerfon' }),
    node('prices', 'price_links', { title: 'Prețuri pentru securitate și automatizări' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la securitate și automatizări' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca interfonul să-l monteze o firmă?', text: 'Descrie clădirea și ce sistem există și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
