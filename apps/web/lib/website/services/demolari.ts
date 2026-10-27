import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "demolari": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const demolari: ServiceContent = {
  slug: 'demolari',
  hub: true,
  seoTitle: 'Demolări: situații, siguranță, moloz și firme',
  seoDescription: 'Demolări pentru case, pereți și anexe: acte, utilități, azbest și evacuarea molozului, de ce depinde costul și cum compari ofertele. Ghiduri, prețuri, firme.',
  summary: 'Casă, perete sau anexă: ce presupune o demolare, ce verifici la primărie, cum se evacuează molozul și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Am nevoie de acte pentru a demola? | În general da, pentru construcții; ce anume depinde de tip și de zonă. Întreabă la primărie înainte de a începe.',
    'Ce utilități se opresc înainte? | Electricitatea, gazul, apa, canalizarea și alte rețele, de către operatori sau personal autorizat, cu confirmare scrisă.',
    'Ce fac dacă am materiale cu azbest? | Nu le sparge și nu le arunca. Se manipulează de firme autorizate, cu protecție; anunță firma înainte de ofertă.',
    'Cum se evacuează molozul? | Prin container sau prin transport către locuri autorizate. Cere în contract cine răspunde și ce documente primești.',
    'Pot sparge un perete singur? | Doar dacă ai aflat că nu e portant și nu are instalații; pereții portanți cer inginer structurist și proiect. În bloc, discută cu asociația.',
    'Cine răspunde pentru pagubele la vecini? | Se stabilește prin contract și prin asigurarea firmei. Documentează starea vecinătății înainte de lucru.',
    'De ce depinde costul? | De mărime, material, acces, metodă, azbest, acte și evacuarea molozului. Cere oferte care separă demolarea de transport.',
  ],
  sinonime: ['dărâmare', 'dărâmare clădire', 'dezafectare', 'lucrări de dezafectare', 'spargere beton', 'tăiere beton'],
  blocks: [
    node('hero', 'hero', { title: 'Demolări', subtitle: 'Casă veche, perete sau anexă: ce verifici la primărie, cum se asigură siguranța și cum compari ofertele. Primești oferte gratuite de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Înainte de start', value: 'Întrebi la primărie' },
      { label: 'Utilități', value: 'Oprite de operatori' },
      { label: 'Azbest', value: 'Doar firme autorizate' },
      { label: 'Moloz', value: 'Evacuat autorizat' },
    ] }),
    node('intro', 'text', { body: para(
      'Demolarea elimină o construcție, dar lasă în urmă un teren, un deșeu și, uneori, un risc pentru vecini. De aceea siguranța, actele și evacuarea molozului se discută înainte de preț.',
      'Pagina te ajută să înțelegi pașii și să ceri oferte comparabile. Ce faci cu terenul după demolare se leagă de construcții, fundații și autorizări, pentru care vezi paginile respective.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Demolare casă, perete sau construcție', text: 'Acte, oprirea utilităților, azbest, moloz și cum alegi firma, pe larg; include și spargerea unui perete.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Demolări pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre demolări' }),
    node('prices', 'price_links', { title: 'Prețuri pentru demolări' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Verifici actele', text: 'Întrebi la primărie ce se cere pentru construcția ta.' },
      { title: 'Oprești utilitățile', text: 'Operatorii deconectează electricitatea, gazul, apa, canalizarea.' },
      { title: 'Vizită și ofertă', text: 'Firma vede locul, materialele și accesul înainte de ofertă.' },
      { title: 'Demolare în siguranță', text: 'Cu împrejmuire, protecție pentru vecini și materiale periculoase tratate separat.' },
      { title: 'Evacuare și curățare', text: 'Molozul ajunge la locuri autorizate, iar terenul se niveleză.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Întreabă ce demolări similare a făcut firma, cum protejează vecinii și cine se ocupă de moloz și de eventualul azbest. Cere dovada asigurării de răspundere civilă.',
      'Cere ofertă scrisă după vizită, cu ce e inclus și cu răspunderea pentru pagube. Pe IntraConstruct vezi firmele verificate și recenziile.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: demolări' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte de la firme din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
