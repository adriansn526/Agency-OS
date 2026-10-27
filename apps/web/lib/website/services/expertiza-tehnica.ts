import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "expertiză tehnică": it presents the situation and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const expertizaTehnica: ServiceContent = {
  slug: 'expertiza-tehnica',
  hub: true,
  seoTitle: 'Expertiză tehnică: cine o face, când e nevoie, firme',
  seoDescription: 'Expertiză tehnică pentru clădiri: ce este, când se cere, cum verifici expertul atestat și cum compari ofertele. Ghiduri, prețuri și specialiști.',
  summary: 'Ce este o expertiză tehnică, când ai nevoie de ea, cum verifici expertul și ce conține raportul pe care îl primești.',
  preturi: [],
  intrebari: [
    'Ce este expertiza tehnică? | O analiză făcută de un specialist asupra unei construcții sau a unei lucrări, prin care se stabilesc starea, cauzele unor probleme sau conformitatea cu documentele. Rezultatul este un raport scris cu concluzii.',
    'Când este necesară? | Când apar degradări și vrei să știi cauza, înainte de modificări importante la structură, după un eveniment grav sau când o autoritate, o bancă ori o instanță cere un raport. Dacă nu ești sigur, întreabă instituția care cere documentul.',
    'Cine poate face o expertiză tehnică? | Un expert tehnic atestat de ministerul de resort, cunoscut sub denumirea veche MLPAT. Verifică atestatul și dacă domeniul lui se potrivește lucrării tale.',
    'Care e diferența dintre expertiză, audit energetic și verificarea proiectului? | Sunt activități diferite, făcute de specialiști diferiți. Expertiza analizează o construcție existentă sau o situație concretă; auditul se ocupă de performanța energetică, iar verificarea se face pe proiect, înainte de execuție.',
    'De ce depinde costul unei expertize? | De tipul și mărimea construcției, de documentele existente, de numărul vizitelor și al investigațiilor, de domeniul de atestare și de scopul raportului. Compară oferte scrise cu același conținut; paginile de preț dau repere.',
    'Cum aleg expertul? | Cere atestatul, întreabă ce lucrări asemănătoare a făcut și ce date îi trebuie. Preferă un expert independent de firma care va executa eventualele reparații.',
    'Raportul meu va fi acceptat de orice instituție? | Nu neapărat. Fiecare instituție poate cere un anumit domeniu sau o anumită formă; clarifică înainte de comandă ce acceptă.',
  ],
  sinonime: ['expert atestat', 'raport de expertiză', 'expertiză structură', 'expertiză clădire', 'expert construcții', 'expertiză case', 'expertiză tehnică clădiri'],
  blocks: [
    node('hero', 'hero', { title: 'Expertiză tehnică', subtitle: 'Ce este, când se cere și cum alegi expertul. Descrie situația și primești oferte de la specialiști verificați, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine o face', value: 'Expert tehnic atestat' },
      { label: 'Primul pas', value: 'Stabilești scopul raportului' },
      { label: 'Compari', value: 'Conținut, vizite, domeniu' },
      { label: 'Rezultat', value: 'Raport scris, semnat' },
    ] }),
    node('intro', 'text', { body: para(
      'O expertiză tehnică te scoate din incertitudine: afli ce se întâmplă cu o clădire, de ce, și ce se poate face. Contează mai ales cine o semnează și dacă raportul răspunde întrebării pe care o ai sau pe care o cere o autoritate.',
      'Pagina te ajută să identifici situația și să alegi un expert. Concluziile tehnice rămân ale specialistului; aici găsești doar cum să pregătești cererea și cum compari ofertele.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Expertiză tehnică pentru construcții', text: 'Pentru fisuri, modificări structurale, dosare la autorități sau bancă și litigii. Pagina explică ce primești și cum alegi expertul.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Expertiză tehnică pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre construcții' }),
    node('prices', 'price_links', { title: 'Prețuri pentru expertiză tehnică' }),
    node('steps', 'steps', { title: 'Cum decurge colaborarea cu un expert', items: [
      { title: 'Scopul raportului', text: 'Spui cui îi este destinat și ce trebuie să lămurească. De aici depinde domeniul expertului.' },
      { title: 'Ofertă scrisă', text: 'Cere ce include prețul: vizitele, măsurătorile, eventualele investigații și forma raportului.' },
      { title: 'Vizită și investigații', text: 'Expertul vede construcția, analizează documentele și cere, dacă e cazul, verificări suplimentare.' },
      { title: 'Raport', text: 'Primești concluzii scrise și, unde este cazul, măsuri recomandate, explicate de expert.' },
      { title: 'Pașii următori', text: 'Pe baza raportului se decide dacă și cum se continuă: consolidări, proiect, depunerea la autoritate.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi expertul', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Verifică atestatul și domeniul lui, cere lucrări asemănătoare și compară cel puțin două oferte pe aceleași criterii. O ofertă mult mai mică lasă de obicei deoparte vizita în teren sau investigațiile.',
      'Pe IntraConstruct vezi specialiștii verificați și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre expertiza tehnică' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de o expertiză tehnică?', text: 'Descrie construcția și primești oferte de la specialiști verificați din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
