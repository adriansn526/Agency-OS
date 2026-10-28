import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "retele-bransamente-gaze": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const reteleBransamenteGaze: ServiceContent = {
  slug: 'retele-bransamente-gaze',
  hub: true,
  seoTitle: 'Rețele și branșamente: gaze, apă, canalizare',
  seoDescription: 'Rețele și branșamente pentru casă: gaze, apă și canalizare, cine face racordarea, ce se cere la operator, de ce depinde costul și cum alegi o firmă autorizată.',
  summary: 'Gaze, apă și canalizare pentru casă: ce face operatorul, ce faci tu pe proprietate, cine are voie să execute și cum compari ofertele.',
  preturi: [],
  intrebari: [
    'Cine face branșamentul la rețea? | Racordarea propriu-zisă o face operatorul de distribuție, apă sau canalizare. Pe proprietate, lucrările se execută de firme sau personal autorizat, în condițiile aprobate de operator.',
    'Ce taxe se plătesc la racordare? | Le stabilește și le comunică operatorul, iar ele pot diferi. Cere-le în scris, de la sursă, înainte să te angajezi în lucrări.',
    'Pot lucra singur la instalația de gaz? | Nu. Lucrările pe gaz se fac doar de personal autorizat, iar punerea în funcțiune cere recepția cerută. Detalii sunt pe pagina despre instalații de gaze.',
    'Ce fac dacă nu există rețea în dreptul casei? | Întrebi operatorul dacă e prevăzută extinderea și în ce condiții, iar între timp discuți soluții proprii: puț forat, fosă, alte variante locale, după reglementările zonei.',
    'Unde e branșamentul electric? | Are pagină proprie, la instalații electrice, fiindcă pașii și operatorul sunt diferiți.',
    'Cum compar ofertele pentru lucrările de pe proprietate? | Pe lucrări separate: săpătură, conductă și accesorii, refacerea suprafețelor, proiect. Verifică ce este inclus și cine ține legătura cu operatorul.',
    'De ce depinde costul? | De taxele operatorului, de distanța până la punctul de racord, de teren și suprafața refăcută, de materiale și de proiect. Cifrele se cer la operator și la firme, nu din surse indirecte.',
  ],
  sinonime: ['rețele utilități', 'utilități casă', 'conducte gaze', 'conducte apă canalizare', 'racorduri utilități', 'cămin apometru'],
  blocks: [
    node('hero', 'hero', { title: 'Rețele și branșamente', subtitle: 'Gaze, apă și canalizare: cine face racordarea, ce se cere la operator și cum alegi firma pentru lucrările de pe proprietate. Primești oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Racordarea', value: 'O face operatorul' },
      { label: 'Taxe și avize', value: 'Se cer la operator' },
      { label: 'Gaz', value: 'Doar instalator autorizat' },
      { label: 'Oferta', value: 'Pe lucrări, separat' },
    ] }),
    node('intro', 'text', { body: para(
      'Utilitățile unei case se leagă la rețelele publice prin branșamente. Pentru fiecare utilitate există un operator, cu condiții, documente și lucrări proprii, iar o parte din lucrări se face pe proprietatea ta, de firme.',
      'Pagina te ajută să separi ce face operatorul de ce faci tu și să ceri oferte corecte. Branșamentul electric rămâne la instalații electrice; focul pe gaz în casă se tratează la instalații de gaze.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Branșament gaze, apă și canalizare', text: 'Pașii spre operator, avizul tehnic de racordare, lucrările de pe proprietate și de ce depinde costul, pe larg.' },
      { title: 'Instalația de gaz din casă', text: 'Se execută doar de instalator autorizat ANRE; vezi pagina despre instalații de gaze.' },
      { title: 'Branșament electric', text: 'Are pagina lui la instalații electrice, cu pașii spre operatorul de rețea.' },
      { title: 'Puț și fosă', text: 'Unde nu există rețea publică, se discută alternative: forajul unui puț sau soluții locale de canalizare.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Rețele și branșamente (gaze, apă) pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre utilități și branșamente' }),
    node('prices', 'price_links', { title: 'Prețuri pentru instalații' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Afli ce rețea există', text: 'Întrebi operatorul dacă rețeaua trece pe strada ta și în ce condiții te poți racorda.' },
      { title: 'Ceri avizul', text: 'Depui cererea cu actele cerute de operator; răspunsul stabilește condițiile.' },
      { title: 'Proiect și lucrări', text: 'Partea de pe proprietate se proiectează și se execută de personal autorizat.' },
      { title: 'Racordare și recepție', text: 'Operatorul execută legătura la rețea și verifică lucrarea.' },
      { title: 'Contract și punere în funcțiune', text: 'Se încheie contractul și se montează contorul sau se pornește utilitatea.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Pentru gaz, cere dovada autorizării executantului. Pentru apă și canalizare, întreabă dacă firma cunoaște cerințele operatorului din zona ta și cere lucrări similare.',
      'Compară ofertele pe lucrări: săpătură, conductă, refacerea suprafețelor, proiect. Pe IntraConstruct vezi firmele verificate și recenziile.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: rețele și branșamente (gaze, apă)' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte de la firme din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
