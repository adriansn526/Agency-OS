import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "structuri metalice și fier forjat": it presents the situations and sends to the guides and price pages (blocks that fill
 * themselves with what is published). It has no price table of its own.
 */
export const structuriMetaliceFierForjat: ServiceContent = {
  slug: 'structuri-metalice-fier-forjat',
  hub: true,
  seoTitle: 'Structuri metalice și fier forjat: situații și firme',
  seoDescription: 'Scări, balustrade, hale, marchize și uși metalice: ce soluții există, cine le proiectează, cum compari ofertele. Ghiduri, prețuri și firme verificate.',
  summary: 'Scări și balustrade, hale metalice, marchize și copertine, uși metalice: cum alegi soluția, cine răspunde de siguranță și cum compari ofertele.',
  preturi: [],
  intrebari: [
    'Ce lucrări intră la structuri metalice și fier forjat? | Scări și balustrade, hale și alte construcții din oțel, marchize și copertine, uși metalice, porți, grilaje și alte elemente fabricate în atelier și montate la fața locului. Fiecare situație are pagina ei mai jos.',
    'Cine stabilește siguranța unei structuri metalice? | Proiectantul sau producătorul, prin calcul, nu aspectul sau obișnuința. La scări, balustrade, hale și copertine mari dimensionarea se cere în scris, iar execuția o face personal calificat.',
    'Sudura poate fi făcută de oricine? | Nu, mai ales la elemente portante. Sudura și îmbinările structurale se fac de personal calificat, iar un atelier serios îți poate spune cine execută și cine verifică.',
    'Am nevoie de autorizație pentru o hală sau o copertină? | Depinde de dimensiune, destinație, teren și zonă. Pentru construcții și structuri mari, întreabă la primărie și la proiectant înainte să începi.',
    'Cum aleg între mai multe oferte? | Compară pe aceleași criterii: material și finisaj, tratamentul anticoroziv, cine proiectează, ce include montajul, termenul și garanția. O sumă globală fără listă nu se poate compara.',
    'De ce depinde costul unei lucrări metalice? | De material, de complexitate, de finisaj, de dimensiune, de transport și montaj și de accesul la locul lucrării. Paginile de preț explică factorii, iar o ofertă detaliată lămurește restul.',
    'Cum se protejează metalul de rugină? | Prin zincare, vopsire potrivită exteriorului sau alte tratamente. Întreabă ce soluție se folosește și cum se protejează zonele sudate, mai ales la lucrări în aer liber.',
  ],
  sinonime: ['fier forjat', 'fierarie', 'fierărie', 'lucrari din metal', 'lucrări din metal', 'structuri metalice', 'atelier metalic', 'fierar'],
  blocks: [
    node('hero', 'hero', { title: 'Structuri metalice și fier forjat', subtitle: 'Scări, balustrade, hale, marchize și uși metalice: ce soluții există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Siguranța', value: 'Stabilită de proiectant' },
      { label: 'Sudura', value: 'Personal calificat' },
      { label: 'Compari', value: 'Material, finisaj, montaj' },
      { label: 'Autorizații', value: 'Depind de caz' },
    ] }),
    node('intro', 'text', { body: para(
      'Lucrările metalice se văd rar în timpul execuției, dar contează mult în timp: o scară trebuie să țină, o copertină trebuie să reziste la vânt, o ușă trebuie să se închidă corect. Aspectul se alege ușor, dar siguranța se stabilește prin proiect și execuție corectă.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Scări metalice și balustrade', text: 'Din inox, oțel sau sticlă, interioare sau exterioare. Siguranța și prinderea contează mai mult decât aspectul.' },
      { title: 'Hale și construcții metalice', text: 'De la proiect și fundații la structură și închideri. Autorizațiile depind de caz, deci întreabă la primărie.' },
      { title: 'Marchize și copertine', text: 'Din fier forjat, policarbonat sau pânză retractabilă. Prinderea în fațadă și vântul sunt punctele sensibile.' },
      { title: 'Uși metalice', text: 'De exterior sau de apartament. Montajul decide rezultatul la fel de mult ca produsul.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Structuri metalice pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre structuri metalice' }),
    node('prices', 'price_links', { title: 'Prețuri pentru structuri metalice' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Vizită și relevee', text: 'Firma vede locul, măsoară și verifică suportul în care se fixează structura.' },
      { title: 'Proiect sau desen de execuție', text: 'Soluția, îmbinările și prinderile se stabilesc în scris și le aprobi înainte de fabricație.' },
      { title: 'Ofertă detaliată', text: 'Cere material, finisaj, protecție anticorozivă, montaj, termen și garanție.' },
      { title: 'Fabricație și montaj', text: 'Piesele se execută în atelier, apoi se montează de echipă calificată, cu verificări în cursul lucrului.' },
      { title: 'Recepție', text: 'Verifici rigiditatea, finisajul și funcționarea și primești garanția în scris.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: material, finisaj, protecție, montaj, termen și garanție. O ofertă mult mai mică lasă de obicei deoparte tratamentul anticoroziv sau o parte din montaj.',
      'Întreabă cine proiectează, cine face sudura și ce lucrări similare poți vedea. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre structuri metalice' }),
    node('firms', 'firms_list', { title: 'Firme de structuri metalice și fier forjat', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai o lucrare metalică de făcut?', text: 'Descrie ce ai nevoie și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
