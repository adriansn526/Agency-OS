import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const bateriiStocareInvertor: SituationContent = {
  slug: 'fotovoltaice-energie-regenerabila--baterii-stocare-invertor',
  categorie: 'fotovoltaice-energie-regenerabila',
  title: 'Baterii de stocare și invertor pentru sistemul fotovoltaic',
  seoTitle: 'Baterii de stocare și invertor: alegere și montaj',
  seoDescription: 'Ce face invertorul și ce rol are bateria într-un sistem fotovoltaic, ce tipuri de invertor există, ce întrebi instalatorul și de ce depinde costul.',
  summary: 'Ce rol au invertorul și bateria într-un sistem fotovoltaic, cum le alegi împreună și ce să compari în ofertele firmelor care le montează.',
  sinonime: [
    'baterii panouri solare', 'baterii solare', 'baterii stocare energie', 'baterii panouri fotovoltaice', 'invertor panouri solare', 'invertoare panouri solare', 'invertor fotovoltaic', 'acumulatori panouri solare',
    'baterii stocare energie electrică',
  ],
  intrebari: [
    'Ce face invertorul? | Transformă curentul continuu produs de panouri în curent alternativ, cel folosit în casă. Controlează și funcționarea sistemului și, la sistemele conectate la rețea, respectă regulile operatorului pentru conectare.',
    'Ce tipuri de invertor există? | În mare, invertoare pentru sisteme conectate la rețea, invertoare pentru sisteme izolate și invertoare hibride, care pot lucra și cu baterie. Alegerea depinde de tipul sistemului și de dacă vrei să adaugi baterie acum sau mai târziu; instalatorul trebuie să o justifice.',
    'Am nevoie de baterie? | Nu întotdeauna. Bateria stochează energia produsă ca să o folosești mai târziu, de pildă seara. Este utilă la sisteme izolate sau când vrei să consumi mai mult din ce produci, dar adaugă componente, spațiu și cost. Decizia se ia după analiza consumului tău.',
    'Ce înseamnă baterie compatibilă cu invertorul? | Nu orice baterie se poate conecta la orice invertor. Compatibilitatea se verifică în fișa tehnică și în ofertă; cere instalatorului să o confirme în scris înainte de comandă.',
    'Unde se montează bateria? | Într-un loc care respectă indicațiile producătorului pentru temperatură, ventilație și acces, de obicei la interior. Cere firmei să arate locul ales și să explice protecțiile prevăzute; partea electrică se face de personal autorizat.',
    'Cât durează bateriile? | Depinde de tipul bateriei, de modul de folosire și de condițiile de montaj. Nu te baza pe cifre din reclame: cere fișa tehnică și condițiile de garanție ale producătorului, în scris.',
    'De ce depinde costul? | De tipul și puterea invertorului, de capacitatea bateriei, de compatibilitatea componentelor, de lucrările la tablou și de montaj. Pentru un ordin de mărime, vezi paginile de preț; compară ofertele pe aceleași componente.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Baterii de stocare și invertor: ce alegi și ce întrebi firma', subtitle: 'Ce face fiecare componentă, cum se potrivesc între ele și ce să compari în oferte. Descrie sistemul și primești oferte de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Invertor', value: 'Transformă curentul pentru casă' },
      { label: 'Baterie', value: 'Stochează energia pentru mai târziu' },
      { label: 'Atenție', value: 'Compatibilitatea componentelor' },
      { label: 'Cine montează', value: 'Personal electric autorizat' },
    ] }),
    node('intro', 'text', { body: para(
      'Panourile produc curent continuu, iar casa folosește curent alternativ. Invertorul face trecerea, iar bateria, când există, păstrează o parte din energie pentru mai târziu. Sunt componentele care decid cât de flexibil și cât de sigur lucrează sistemul fotovoltaic.',
      'Pagina te ajută să înțelegi rolul fiecăreia și ce să întrebi la ofertă. Nu recomandă mărci sau modele. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('what-h', 'heading', { text: 'Ce face fiecare componentă', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Invertor pentru rețea', text: 'Pentru sisteme conectate la rețeaua de distribuție, cu respectarea cerințelor operatorului.' },
      { title: 'Invertor hibrid', text: 'Poate lucra și cu baterie, fie de la început, fie adăugată ulterior.' },
      { title: 'Invertor pentru sistem izolat', text: 'Pentru sisteme care nu sunt conectate la rețea, de obicei împreună cu baterii.' },
      { title: 'Bateria de stocare', text: 'Păstrează energia produsă ziua pentru folosirea ei când panourile nu produc. Capacitatea și tipul se aleg după consum.' },
    ] }),
    node('where-h', 'heading', { text: 'Când are sens o baterie', level: 'h2' }),
    node('where', 'text', { body: para(
      'Bateria are sens la sistemele izolate și acolo unde vrei să folosești seara o parte din ce a produs sistemul ziua sau să ai alimentare în anumite situații. Adaugă însă cost, spațiu, cerințe de montaj și componente suplimentare.',
      'Dacă nu ești sigur, cere firmei să dimensioneze sistemul și cu baterie, și fără, și să explice diferențele, inclusiv posibilitatea de a o adăuga mai târziu.',
    ) }),
    node('steps-h', 'steps', { title: 'Ordinea alegerii și a montajului', items: [
      { title: 'Stabilirea nevoii', text: 'Se analizează consumul, tipul de sistem și dacă bateria răspunde unei nevoi reale.' },
      { title: 'Alegerea invertorului', text: 'Se alege tipul potrivit sistemului și regulilor de conectare, apoi se verifică ce baterii acceptă.' },
      { title: 'Alegerea bateriei', text: 'Se verifică compatibilitatea cu invertorul, capacitatea și condițiile de montaj, în fișele tehnice.' },
      { title: 'Montaj', text: 'Se montează în locul prevăzut, cu protecțiile și cablurile potrivite, de personal electric autorizat.' },
      { title: 'Configurare și predare', text: 'Se configurează și se testează sistemul, se predau documentele și instrucțiunile și se explică funcționarea.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Componente necompatibile', text: 'Baterie și invertor cumpărate separat, fără verificarea compatibilității, pot să nu funcționeze împreună.' },
      { title: 'Baterie pusă „de formă”', text: 'Adăugată fără o nevoie clară, crește costul fără beneficiu.' },
      { title: 'Loc nepotrivit', text: 'Montarea fără respectarea indicațiilor producătorului poate scurta viața bateriei sau crea riscuri.' },
      { title: 'Invertor ales fără regulile de conectare', text: 'La sistemele cu rețea, operatorul are cerințe pe care trebuie să le verifici înainte.' },
      { title: 'Garanții neclare', text: 'Cere în scris ce acoperă garanția și ce condiții cere producătorul.' },
      { title: 'Montaj de către neautorizați', text: 'Partea electrică, în special de curent continuu, o face doar personalul calificat.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de tipul și puterea invertorului, de capacitatea și tipul bateriei, de compatibilitatea dintre ele, de cabluri, protecții și lucrări la tablou, precum și de manoperă. Un sistem cu baterie are mai multe componente, deci mai multe rânduri de comparat.',
      'Cere oferte cu modelele exacte și cu lista lucrărilor, apoi compară pe aceleași rânduri. Pentru un ordin de mărime, vezi paginile de preț.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Verifică modelele invertorului și ale bateriei, confirmarea scrisă a compatibilității, capacitatea, locul de montaj, protecțiile, manopera, garanția fiecărei componente și cine rezolvă problemele după montaj.',
      'O ofertă care nu spune modelele sau compatibilitatea nu se poate compara cu una completă.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Alege o firmă care a mai montat sisteme cu invertor și baterie, cu personal electric autorizat și cu service pentru produsele montate. Cere contract scris, garanții și instrucțiuni la predare.',
      'Pentru tablou și racord, vezi și paginile despre instalații electrice. Pentru panourile propriu-zise, vezi pagina despre panouri fotovoltaice pentru casă.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre baterii și invertor' }),
    node('prices', 'price_links', { title: 'Prețuri pentru fotovoltaice' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la fotovoltaice și energie regenerabilă' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie sistemul și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
