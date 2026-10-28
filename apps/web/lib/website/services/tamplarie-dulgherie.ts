import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "tâmplărie și dulgherie": it presents the situations and sends to the guides and price pages (blocks that fill themselves with
 * what is published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const tamplarieDulgherie: ServiceContent = {
  slug: 'tamplarie-dulgherie',
  hub: true,
  seoTitle: 'Tâmplărie și dulgherie: uși, situații și firme verificate',
  seoDescription: 'Tâmplărie și dulgherie pentru casă: uși de interior, de intrare și de garaj, lucrări din lemn. Cum alegi, ce întrebi și cum compari ofertele firmelor.',
  summary: 'Uși de interior, de intrare și de garaj, plus lucrări din lemn: cum alegi, ce întrebi și cum compari ofertele firmelor de tâmplărie.',
  preturi: [],
  intrebari: [
    'Ce lucrări intră la tâmplărie și dulgherie? | Tâmplăria privește uși, ferestre, scări și alte elemente din lemn sau compozite. Dulgheria privește lucrările de structură din lemn, cum sunt șarpantele sau foișoarele. Paginile de situații de mai jos acoperă ușile; alte lucrări au pagini proprii.',
    'Ce tipuri de uși există în casă? | Uși de interior, uși de intrare și de exterior și uși de garaj. Fiecare are cerințe diferite: umiditate, siguranță, izolare sau mecanisme. Ușile termopan sunt tratate la geamuri.',
    'Cine ia măsurătorile pentru uși? | De preferat montatorul sau firma care livrează ușa. Măsurătoarea pe loc ține cont de gol, de grosimea peretelui și de pardoseală, iar o greșeală se vede abia la montaj.',
    'Ce siguranțe trebuie să aibă o ușă de garaj automată? | Dispozitive care opresc sau inversează mișcarea la obstacol, precum limitatoarele și fotocelulele, reglate și testate de personal calificat. Nu le dezactiva și nu monta singur motorul.',
    'Cum aleg materialul pentru uși? | După loc: la baie sau la exterior contează rezistența la umiditate, iar la intrare siguranța și izolarea. Lemnul masiv, MDF-ul, laminatul și metalul au avantaje și limite diferite, explicate la fiecare situație.',
    'De ce depinde costul lucrărilor de tâmplărie? | De tipul și numărul elementelor, de material și finisaje, de starea golurilor, de montaj și de accesorii. Compară oferte care despart produsul de manoperă; paginile de preț explică factorii.',
    'Cum aleg o firmă de tâmplărie? | Alege una care măsoară pe loc, îți explică opțiunile și lucrează curat. Cere ofertă scrisă, garanție pentru montaj și lucrări similare pe care le poți vedea.',
  ],
  sinonime: ['tâmplărie', 'tamplarie', 'dulgherie', 'tâmplar', 'dulgher', 'lucrări din lemn', 'montaj uși'],
  blocks: [
    node('hero', 'hero', { title: 'Tâmplărie și dulgherie', subtitle: 'Uși de interior, de intrare și de garaj, plus lucrări din lemn: cum alegi și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Măsurătoare pe loc' },
      { label: 'Alegi după', value: 'Locul și solicitările ușii' },
      { label: 'Compari', value: 'Produs, montaj, accesorii' },
      { label: 'La garaj', value: 'Siguranțe și personal calificat' },
    ] }),
    node('intro', 'text', { body: para(
      'Tâmplăria și dulgheria țin de elementele din lemn și compozite pe care le folosești zilnic: uși, scări, structuri. Calitatea se vede în detalii, la îmbinări, la reglaje și la modul în care elementul a fost montat și protejat.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Uși de interior', text: 'Materiale, ușa de baie, măsurători și montaj: ce alegi și ce cuprinde oferta.' },
      { title: 'Uși de exterior și de intrare', text: 'Casă sau apartament: siguranță, izolare, montaj și ce compari între oferte.' },
      { title: 'Uși de garaj', text: 'Secționale, batante sau rulante și automatizarea făcută de personal calificat.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Tâmplărie și dulgherie pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre tâmplărie' }),
    node('prices', 'price_links', { title: 'Prețuri pentru tâmplărie și dulgherie' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Vizită și măsurătoare', text: 'Firma vede locul și măsoară pe loc; dimensiunile estimate nu ajung.' },
      { title: 'Ofertă detaliată', text: 'Cere produsul, materialul, accesoriile, montajul și garanția, pe linii separate.' },
      { title: 'Comandă și contract', text: 'Contract scris cu termen și condiții de plată; evită plata integrală în avans.' },
      { title: 'Pregătirea golurilor', text: 'Golurile se verifică și se repară înainte de montaj, ca elementul să se așeze corect.' },
      { title: 'Montaj și reglaje', text: 'Se fixează, se reglează și se testează funcționarea, cu automatizări doar de personal calificat.' },
      { title: 'Verificare și predare', text: 'Verifici îmbinările, închiderea și finisajele și primești documentele și garanția.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două oferte și compară-le pe aceleași criterii: produsul și materialul, accesoriile, montajul, reglajele, termenul și garanția. O ofertă mult mai mică poate lăsa deoparte măsurătoarea, tocul sau pregătirea golului.',
      'Întreabă ce lucrări similare a făcut firma și cere, dacă se poate, referințe. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre tâmplărie și dulgherie' }),
    node('firms', 'firms_list', { title: 'Firme de tâmplărie și dulgherie', limit: '6' }),
    node('cta', 'request_cta', { title: 'Cauți o firmă de tâmplărie?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
