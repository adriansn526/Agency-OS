import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const panouriFotovoltaiceCasa: SituationContent = {
  slug: 'fotovoltaice-energie-regenerabila--panouri-fotovoltaice-casa',
  categorie: 'fotovoltaice-energie-regenerabila',
  title: 'Panouri fotovoltaice pentru casă: ofertă și montaj',
  seoTitle: 'Panouri fotovoltaice casă: ofertă și montaj',
  seoDescription: 'Cine montează panouri fotovoltaice, ce trebuie să conțină o ofertă, de ce depinde costul sistemului și cum compari firmele. Verifici și cine face racordarea.',
  summary: 'Cine montează un sistem fotovoltaic pentru casă, ce intră într-o ofertă, de ce depinde costul și cum compari firmele care fac proiectul, montajul și punerea în funcțiune.',
  sinonime: [
    'panouri fotovoltaice', 'panou fotovoltaic', 'sistem fotovoltaic', 'sisteme fotovoltaice', 'fotovoltaice', 'panouri fotovoltaice pret', 'pret panouri fotovoltaice',
    'montaj panouri fotovoltaice', 'montat panouri fotovoltaice', 'instalare panouri fotovoltaice', 'kit panouri fotovoltaice', 'sistem fotovoltaic 5 kw', 'sistem on grid', 'sistem off grid', 'casa verde fotovoltaice',
    'panouri fotovoltaice preț', 'preț panouri fotovoltaice', 'casă verde fotovoltaice',
  ],
  intrebari: [
    'Cine montează panouri fotovoltaice? | O firmă specializată, cu personal care lucrează la înălțime pe acoperiș și cu electricieni autorizați pentru partea electrică. Racordarea la rețea nu o face firma singură: ea se face împreună cu operatorul de distribuție, după regulile lui.',
    'Ce intră într-o ofertă pentru un sistem fotovoltaic? | Panourile, structura de prindere, invertorul, cablurile și protecțiile, eventual bateria, manopera de montaj, proiectul, documentația pentru operator și punerea în funcțiune. Cere lista completă, cu modelele exacte, și verifică ce rămâne în sarcina ta.',
    'Ce înseamnă sistem on grid și sistem off grid? | Un sistem on grid este legat la rețeaua de distribuție și schimbă energie cu ea. Un sistem off grid funcționează izolat, de obicei cu baterii. Tipul ales schimbă componentele și actele necesare, deci îl discuți cu firma înainte de ofertă.',
    'Un kit de panouri fotovoltaice se poate monta singur? | Kiturile reunesc componente, dar montajul pe acoperiș și conexiunile electrice cer personal autorizat, iar racordarea la rețea are propria procedură. Nu monta singur ceea ce implică lucru la înălțime sau curent, iar garanția produselor poate depinde de cine a făcut instalarea.',
    'De ce depinde costul unui sistem fotovoltaic? | De mărimea sistemului, de tipul și calitatea componentelor, de tipul acoperișului și al prinderii, de accesul pentru montaj, de dacă se adaugă baterie și de lucrările la tabloul electric. Pentru un ordin de mărime, vezi pagina de prețuri dedicată.',
    'Rezistă acoperișul meu la panouri? | Depinde de structura și de starea acoperișului. Firma ar trebui să verifice învelitoarea și șarpanta înainte de ofertă; dacă acoperișul trebuie reparat, mai bine se face înainte de montaj. Detalii despre structură găsești la pagina despre șarpantă.',
    'Mai există programe de sprijin pentru panouri fotovoltaice? | Programele se schimbă, au condiții și perioade proprii și nu pot fi promise de o firmă. Verifică în prezent pe site-urile instituțiilor care le administrează și cere firmei să explice în scris ce parte din lucrare se poate încadra, nu doar să promită.',
    'Cum aleg firma care montează? | Cere lucrări similare cu date de contact pentru referințe, certificările personalului care face partea electrică, contract scris cu etape și garanții pentru montaj și pentru produse, plus un plan clar pentru documentele către operator.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Panouri fotovoltaice pentru casă: cine montează și cum compari ofertele', subtitle: 'Ce trebuie să conțină o ofertă, de ce depinde costul și ce întrebi firma. Descrie casa și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine montează', value: 'Firmă cu personal autorizat' },
      { label: 'Primul pas', value: 'Verificarea acoperișului și a consumului' },
      { label: 'Oferta', value: 'Componente, montaj și acte separate' },
      { label: 'Racordare', value: 'Procedură cu operatorul' },
    ] }),
    node('intro', 'text', { body: para(
      'Un sistem fotovoltaic transformă lumina soarelui în curent electric pe care îl folosești în casă. Mulți caută direct produsul, un kit sau un preț pe panou. Ce decide însă rezultatul este proiectul, calitatea montajului și corectitudinea actelor, adică lucrurile pe care le face firma.',
      'Pagina te ajută să înțelegi ce cuprinde o lucrare completă, cine face fiecare parte și ce să compari între oferte. Nu recomandă mărci sau produse. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('what-h', 'heading', { text: 'Din ce este făcut un sistem fotovoltaic', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Panourile', text: 'Captează lumina și produc curent continuu. Se montează pe acoperiș sau pe o structură la sol, orientate după locul și umbrirea terenului.' },
      { title: 'Structura de prindere', text: 'Susține panourile și le leagă de acoperiș sau de sol. Se alege după tipul învelitorii și trebuie să reziste la vânt și zăpadă.' },
      { title: 'Invertorul', text: 'Transformă curentul continuu în curent alternativ pentru casă. Are propria pagină, la care trimitem mai jos.' },
      { title: 'Cablaj și protecții', text: 'Cabluri, conectori, siguranțe și descărcătoare, montate de personal autorizat, plus legătura la tabloul electric.' },
    ] }),
    node('where-h', 'heading', { text: 'On grid sau off grid', level: 'h2' }),
    node('where', 'text', { body: para(
      'Un sistem on grid este legat la rețeaua de distribuție: consumi din el când produce, iar dacă ai nevoie de mai mult sau soarele lipsește, preiei din rețea. Pentru a-l conecta există o procedură cu operatorul de distribuție, pe care o descrie ghidul despre prosumator.',
      'Un sistem off grid funcționează izolat de rețea, de obicei cu baterii. Se folosește unde nu există racord sau unde se dorește independență, dar cere o dimensionare mai atentă. Alegerea între cele două se face după situația locuinței și după ce vrei să obții.',
    ) }),
    node('steps-h', 'steps', { title: 'Ordinea lucrării', items: [
      { title: 'Analiza locului și a consumului', text: 'Firma vede acoperișul, orientarea, umbrirea și facturile tale, apoi propune o soluție în loc să pornească de la un kit gata făcut.' },
      { title: 'Verificarea acoperișului', text: 'Se verifică starea învelitorii și a structurii. Dacă e nevoie de reparații, se fac înainte de montaj.' },
      { title: 'Proiect și acte', text: 'Documentația tehnică și cererile către operator se pregătesc înainte de a începe montajul, conform regulilor în vigoare.' },
      { title: 'Montaj', text: 'Prinderea structurii, panourile, cablurile și invertorul, de către personal autorizat, cu măsuri de protecție la înălțime.' },
      { title: 'Verificare și punere în funcțiune', text: 'Se testează instalația, se predau documentele și se parcurg pașii cu operatorul pentru contor și conectare.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Alegerea după produs, nu după proiect', text: 'Un kit gata făcut poate să nu se potrivească acoperișului sau consumului tău.' },
      { title: 'Acoperiș neverificat', text: 'Montajul pe o învelitoare uzată te obligă să demontezi totul pentru reparații.' },
      { title: 'Oferte necomparabile', text: 'O ofertă fără componente și fără acte incluse nu se compară cu una completă.' },
      { title: 'Actele lăsate pe mai târziu', text: 'Sistemul nu se conectează fără pașii cu operatorul, indiferent cât de repede se montează.' },
      { title: 'Promisiuni de economii', text: 'Nicio firmă nu poate garanta o recuperare a investiției fără să-ți analizeze consumul și rețeaua.' },
      { title: 'Lucru neautorizat', text: 'Partea electrică și lucrul la înălțime se fac doar de personal calificat și autorizat.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de mărimea sistemului, de tipul și calitatea componentelor, de tipul de acoperiș și de prindere, de accesul pentru montaj, de lungimea cablurilor, de lucrările la tabloul electric și de dacă se adaugă baterie. La acestea se adaugă proiectul și documentația.',
      'Cere oferte care separă echipamentele, manopera și actele și care numesc modelele exacte. Pentru un ordin de mărime, vezi paginile de preț de mai jos.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Pune ofertele alături și compară aceleași rânduri: modelele panourilor și ale invertorului, structura de prindere, protecțiile, manopera, proiectul și documentele pentru operator, termenul, garanția pentru produse și garanția pentru montaj. Întreabă ce se întâmplă dacă operatorul cere modificări.',
      'Fii atent la ofertele care promit o producție sau o economie fără să-ți fi văzut casa și facturile. O ofertă serioasă pornește de la datele tale.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere lucrări similare pe care le poți vedea sau referințe de la clienți, certificările personalului pentru partea electrică și un contract scris cu etape, termene și garanții. Întreabă cine face documentația pentru operator și cine rămâne responsabil după punerea în funcțiune.',
      'Pentru partea de racord și tablou, vezi și paginile despre instalații electrice. Pentru structura acoperișului, vezi pagina despre șarpantă.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre panouri fotovoltaice' }),
    node('prices', 'price_links', { title: 'Prețuri pentru fotovoltaice' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la fotovoltaice și energie regenerabilă' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie casa și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
