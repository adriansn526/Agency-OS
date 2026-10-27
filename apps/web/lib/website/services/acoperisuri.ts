import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "acoperișuri": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages, so the page does not compete with them.
 */
export const acoperisuri: ServiceContent = {
  slug: 'acoperisuri',
  hub: true,
  seoTitle: 'Acoperișuri: situații, soluții și firme verificate',
  seoDescription: 'Șarpantă, învelitoare, jgheaburi, izolație și acoperire de terasă: ce lucrări există, de ce depinde costul și cum compari ofertele. Firme verificate.',
  summary: 'Șarpantă, învelitoare, jgheaburi, izolație de mansardă sau acoperire de terasă: ce lucrări există, de ce depinde costul și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Din ce părți este alcătuit un acoperiș și ce lucrări se fac la el? | În mare, structura (șarpanta), învelitoarea, sistemul de scurgere a apei (jgheaburi și burlane) și izolația. Lucrările se pot comanda împreună sau separat, de la o reparație punctuală până la un acoperiș nou. Ghidurile de mai jos explică fiecare situație.',
    'De ce depinde costul unei lucrări la acoperiș? | Depinde de suprafață, de forma acoperișului (număr de ape, lucarne, pantă), de materialul ales, de accesibilitate și de starea structurii existente. Paginile de prețuri de mai jos explică factorii, iar o sumă corectă se stabilește doar după o vizită la fața locului.',
    'Am nevoie de autorizație pentru lucrări la acoperiș? | Depinde de lucrare: o reparație sau o schimbare simplă de învelitoare nu este la fel cu modificarea formei sau a structurii, iar în zone protejate sau la clădiri monument pot exista reguli suplimentare. Întreabă la primărie înainte să începi și cere părerea unui specialist.',
    'Pot schimba acoperișul într-un bloc? | Acoperișul blocului este parte comună, deci lucrările se hotărăsc la nivelul asociației de proprietari, nu de un singur apartament. Întreabă asociația cum se procedează și cine contractează firma.',
    'Cum recunosc o infiltrație la acoperiș? | Semnele obișnuite sunt petele pe tavan, tencuiala care se umflă sau se desprinde, mirosul de igrasie în pod și picăturile după ploaie. Cauza exactă se găsește la fața locului, de aceea merită o verificare făcută de un specialist înainte de a repara la întâmplare.',
    'Ce garanție ar trebui să ofere firma? | Cere garanția pentru manoperă în scris și devizul cu materialele și accesoriile folosite, pentru că garanția materialelor depinde de un montaj corect. Compară ofertele pe conținut, nu doar pe sumă, și cere referințe pentru lucrări similare.',
    'Când se pot face lucrări la acoperiș? | Cel mai bine în zile fără ploaie și fără vânt puternic; unele materiale se montează greu pe vreme rece sau umedă. Pentru o urgență (o infiltrație activă) firma poate propune o intervenție provizorie până la lucrarea completă.',
  ],
  sinonime: ['acoperiș', 'acoperișuri', 'lucrări acoperiș', 'reparații acoperiș', 'montaj acoperiș', 'firmă acoperișuri'],
  blocks: [
    node('hero', 'hero', { title: 'Acoperișuri', subtitle: 'Șarpantă, învelitoare, jgheaburi, izolație sau acoperire de terasă: ce soluții există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații', 'Firme verificate'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Vizită și verificarea structurii' },
      { label: 'Ce alegi', value: 'Soluția potrivită acoperișului' },
      { label: 'Compari', value: 'Materiale, accesorii, garanție' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'Acoperișul protejează toată casa, iar greșelile de execuție apar abia după prima ploaie serioasă sau prima iarnă. Lucrarea are mai multe părți care se pot comanda împreună sau separat: structura, învelitoarea, sistemul de scurgere a apei și izolația. Cele mai multe probleme apar la îmbinări, la coamă, la streașină, în jurul coșului și al lucarnelor.',
      'Pagina aceasta te ajută să identifici situația și te trimite la ghidul potrivit. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Acoperiș pentru terasă', text: 'Policarbonat, sisteme retractabile sau pergolă: ghidul arată cum alegi între ele și ce compari în oferte.' },
      { title: 'Jgheaburi și burlane', text: 'Colectează apa de pe acoperiș; contează materialul, pantele și prinderea corectă, iar ghidul explică montajul și înlocuirea.' },
      { title: 'Șarpantă', text: 'Structura care poartă învelitoarea: ghidul explică construcția, reparația și ce intră în manopera de dulgherie.' },
      { title: 'Învelitoare', text: 'Țiglă, tablă sau șindrilă: fiecare material are avantaje și limite, iar montajul corect decide cât ține acoperișul.' },
      { title: 'Izolație acoperiș și mansardă', text: 'Ordinea straturilor și soluția aleasă contează pentru confort; ghidul explică ce să compari în oferte.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Acoperișuri pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre acoperișuri' }),
    node('prices', 'price_links', { title: 'Prețuri pentru acoperișuri' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Vizită și verificare', text: 'Firma vede acoperișul, măsoară suprafața și verifică starea structurii. Oferta trebuie să pornească de aici.' },
      { title: 'Ofertă detaliată', text: 'Devizul spune clar materialele, accesoriile, manopera și termenul. Compară oferte cu același conținut.' },
      { title: 'Contract și avans', text: 'Contract scris cu garanția pentru manoperă. Evită plata integrală în avans.' },
      { title: 'Execuție', text: 'Lucrarea se face pe etape, cu atenție la îmbinări, coamă, streașină și racorduri; cere fotografii din fiecare etapă.' },
      { title: 'Recepție', text: 'Verifici împreună cu echipa îmbinările și scurgerea apei, apoi primești garanția în scris.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma pentru acoperiș', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: materialele și accesoriile incluse, termenul de execuție și garanția pentru manoperă. O ofertă mult mai mică decât celelalte lasă de obicei deoparte folia, ventilațiile sau accesoriile.',
      'Întreabă dacă echipa lucrează la înălțime cu echipament de protecție și cere referințe: poze ale unor lucrări similare. Evită plata integrală în avans și lucrările fără contract. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre acoperișuri' }),
    node('firms', 'firms_list', { title: 'Firme de acoperișuri', limit: '6' }),
    node('request-cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
