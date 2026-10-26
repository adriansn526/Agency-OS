import { node, para, type GuideContent } from './types'

export const igrasie: GuideContent = {
  slug: 'igrasie',
  serviciu: 'hidroizolatii',
  title: 'Igrasia în pereți: cauze, soluții și când ai nevoie de o firmă',
  seoTitle: 'Igrasie în pereți: cauze și soluții care funcționează',
  seoDescription: 'Cum recunoști igrasia și o deosebești de condens și infiltrații, de ce reapare după vopsit și ce soluții durabile există: drenaj, hidroizolație, bariere în zidărie.',
  summary: 'Cum recunoști igrasia, cum o deosebești de condens și infiltrații, de ce reapare după ce ai vopsit și ce soluții durabile există.',
  keyword: 'igrasie',
  keywords: ['igrasie', 'igrasie pereti interiori', 'infiltratii apa pereti', 'solutie igrasie pereti', 'eliminarea igrasiei din pereti', 'reparatii infiltratii apa', 'solutie pentru igrasie'],
  intrebari: [
    'Care este diferența dintre igrasie, condens și infiltrații? | Igrasia este umezeala care urcă din sol prin zidărie și apare la baza pereților. Condensul se formează pe suprafețe reci când aerul umed nu este ventilat, tipic în colțuri și în spatele mobilei. Infiltrațiile vin de sus sau din conducte și lasă pete localizate, de pildă sub o fereastră, sub acoperiș sau sub o baie.',
    'Se poate scăpa definitiv de igrasie? | Da, dacă se tratează cauza, nu doar aspectul: apa din jurul casei trebuie îndepărtată, iar pereții au nevoie de hidroizolație sau de o barieră în zidărie. Vopseaua și tencuielile aplicate peste peretele umed ascund problema pentru câteva luni, apoi igrasia reapare.',
    'Merg vopselele și tencuielile anti-igrasie? | Doar ca etapă finală, după ce cauza a fost tratată și peretele s-a uscat. Aplicate direct pe un perete care primește apă continuu, nu rezolvă problema și se degradează.',
    'Cât durează până se usucă un perete după tratament? | De la câteva luni la peste un an, în funcție de grosimea zidului, de cât de umed era și de ventilația încăperii. Tencuiala finală se aplică abia după uscare; o firmă serioasă îți explică acest calendar din start.',
    'Cine face diagnosticul și cât costă? | Diagnosticul îl face o firmă de hidroizolații sau un specialist în igrasie, cu măsurători de umiditate și cu verificarea sursei de apă. Unele firme îl includ în ofertă. Cere ofertă după diagnostic, nu înainte, pentru că metoda aleasă schimbă mult costul.',
    'Ajută un dezumidificator? | Scade umezeala aerului din cameră și poate reduce condensul și mucegaiul, dar nu oprește apa care urcă din zidărie. Este o măsură de confort, nu o soluție pentru cauza igrasiei.',
    'Pot trata igrasia pe interior? | Există soluții aplicate pe interior, cum sunt injecțiile cu rășini sau soluții hidrofuge în zidărie și mortarele speciale. Sunt mai potrivite când nu poți săpa în exterior, dar rezultatul este mai sigur dacă se tratează și apa din exterior.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Igrasia în pereți: cauze și soluții', subtitle: 'Cum recunoști igrasia, de ce reapare după vopsit și ce soluții durabile există. Dacă ai nevoie de o firmă, ceri oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cauza frecventă', value: 'Apă care urcă din sol' },
      { label: 'Unde apare', value: 'La baza pereților' },
      { label: 'Primul pas', value: 'Diagnostic, nu vopsea' },
      { label: 'Uscare', value: 'Luni, nu zile' },
    ] }),
    node('intro', 'text', { body: para(
      'Igrasia este umezeala care urcă din sol prin zidărie, prin capilaritate, și se vede ca pete la baza pereților, tencuială care se desprinde, mucegai și pulbere albă de săruri pe suprafață. Este problema clasică a caselor vechi, dar apare și la construcții noi cu hidroizolație făcută greșit sau cu apă pluvială care nu este dusă departe de fundație.',
      'Greșeala cea mai frecventă este tratarea aspectului: ștergi, vopsești, pui tencuială nouă, iar peste câteva luni petele revin. De aceea ordinea corectă este aceasta: stabilești ce fel de umezeală ai, tratezi sursa apei și abia apoi refaci finisajele.',
    ) }),
    node('diff-h', 'heading', { text: 'Igrasie, condens sau infiltrație', level: 'h2' }),
    node('diff', 'cards', { columns: '3', items: [
      { title: 'Igrasie', text: 'Umezeală care urcă din sol: la baza pereților, de regulă sub un metru, cu săruri albe și tencuială care se exfoliază.' },
      { title: 'Condens', text: 'Apă pe suprafețe reci din aer prea umed: în colțuri, pe geamuri, în spatele mobilei, mai ales iarna și în camere ventilate prost.' },
      { title: 'Infiltrație', text: 'Apă de la acoperiș, terasă, țeavă sau baie: pete localizate la tavan sau sub ferestre, care cresc după ploaie sau scurgeri.' },
    ] }),
    node('cause-h', 'heading', { text: 'De ce apare igrasia', level: 'h2' }),
    node('cause', 'text', { body: para(
      'Cauzele frecvente sunt hidroizolația orizontală lipsă sau deteriorată între fundație și pereți (casele vechi nu au), hidroizolația verticală exterioară lipsă sau crăpată, apa de ploaie care stă lângă casă din cauza trotuarului fără pantă sau a jgheaburilor lipsă, apa freatică ridicată și conductele sparte lângă fundație.',
      'Ventilația slabă agravează situația: umezeala care ajunge în perete nu se mai poate evapora și își ridică nivelul în zid.',
    ) }),
    node('steps', 'steps', { title: 'Cum se tratează, în ordine', items: [
      { title: 'Diagnostic', text: 'Se măsoară umiditatea, se identifică sursa apei și se stabilește dacă este igrasie, condens sau infiltrație.' },
      { title: 'Oprirea apei din exterior', text: 'Jgheaburi și burlane funcționale, trotuar cu pantă, drenaj perimetral acolo unde apa stagnează.' },
      { title: 'Hidroizolație pe exterior', text: 'Se sapă lângă fundație, se curăță zidul și se aplică hidroizolație verticală cu protecție și drenaj.' },
      { title: 'Barieră în zidărie', text: 'Pe case vechi, fără hidroizolație orizontală: injecții cu rășini sau soluții hidrofuge, ori alte metode de barieră.' },
      { title: 'Uscarea peretelui', text: 'Peretele se usucă în timp, cu ventilație. Nu se vopsește și nu se tencuiește cât este umed.' },
      { title: 'Refacerea finisajelor', text: 'Tencuială de sanare sau finisaj nou, după uscare și după ce sursa a fost tratată.' },
    ] }),
    node('hire-h', 'heading', { text: 'Când ai nevoie de o firmă', level: 'h2' }),
    node('hire', 'text', { body: para(
      'Dacă petele revin după ce ai vopsit, dacă apar săruri albe și tencuială care cade, dacă mucegaiul se întinde sau dacă locuința este veche și nu știi cum a fost hidroizolată, mai bine ceri un diagnostic. Aceleași simptome pot veni din cauze diferite, iar o metodă greșită înseamnă bani cheltuiți fără rezultat.',
      'Cere ofertă scrisă, cu metoda descrisă, produsele folosite, zonele tratate, durata de uscare și garanția. Diferențele mari de preț vin adesea din metodă: o firmă care doar tencuiește și una care tratează cauza nu oferă aceeași lucrare.',
    ) }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de lungimea și grosimea pereților afectați, de metoda aleasă (hidroizolație pe exterior cu săpătură, injecții în zidărie, drenaj), de accesul la fundație, de materiale și de refacerea finisajelor. Cere oferta după diagnostic și compară metodele, nu doar prețurile.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre igrasie' }),
    node('prices', 'price_links', { title: 'Prețuri pentru hidroizolații' }),
    node('guides', 'guide_links', { title: 'Alte ghiduri despre hidroizolații' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de un diagnostic sau de o ofertă?', text: 'Descrie problema și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
