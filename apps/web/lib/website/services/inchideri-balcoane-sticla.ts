import { node, para, type ServiceContent } from './types'

export const inchideriBalcoaneSticla: ServiceContent = {
  slug: 'inchideri-balcoane-sticla',
  seoTitle: 'Închidere balcon cu sticlă: sisteme glisante & prețuri',
  seoDescription: 'Închideri balcoane cu sticlă securizată fără rame sau termopan glisant. Panoramă 100%, izolare fonică, prețuri orientative și oferte de la montatori.',
  summary: 'Închiderea modernă a balcoanelor cu sticlă securizată fără rame: sisteme glisante-batante, panoramă completă, izolație fonică și protecție în orice sezon.',
  sinonime: [
    'inchidere balcon sticla',
    'geamuri glisante balcon',
    'inchidere balcon fara rama',
    'balcon sticla securizata',
    'inchideri balcoane',
    'sticla armonica balcon',
    'pret inchidere balcon sticla',
  ],
  preturi: [
    'Sistem glisant-batant fără rame (sticlă securizată 8 mm) | 550–900 lei/mp | Deschidere completă tip armonică, parcare laterală',
    'Sistem glisant-batant cu sticlă securizată 10 mm | 700–1.100 lei/mp | Recomandat la etaje înalte expuse la vânt puternic',
    'Sistem glisant cu geam termopan dublu (barieră fonică/termică) | 950–1.600 lei/mp | Pachet sticlă 20–22 mm, izolare termică ridicată',
    'Sistem culisant paralel pe șine multiple (3–5 căi) | 600–1.000 lei/mp | Glisare în cascadă fără ocupare spațiu interior',
    'Montaj și etanșare profesională (per lucrare) | 400–900 lei/balcon | Fixare mecanică, reglaje și etanșare perimetrală',
    'Vopsire profile aluminiu culori speciale RAL / textură lemn | +10–20% | Profil aluminiu standard eloxat sau vopsit alb/antracit',
  ],
  intrebari: [
    'Este nevoie de autorizație de construire pentru închiderea balconului cu sticlă fără rame? | Sistemele cu sticlă glisantă fără profile verticale nu modifică structura de rezistență și nu schimbă aspectul arhitectural al fațadei, fiind considerate închideri demontabile. În majoritatea cazurilor nu este necesară o autorizație complexă de construire, însă este recomandată o notificare sau consultarea asociației de proprietari.',
    'Cum se spală geamurile pe exterior dacă locuiesc la etaj superior? | Sistemul de tip armonică (glisant-batant) permite fiecărui panou de sticlă să gliseze până la capătul șinei și să se deschidă batant la 90 de grade spre interiorul balconului. Astfel, ambele fețe ale fiecărui geam se curăță confortabil și în deplină siguranță din interior.',
    'Cât de rezistentă este sticla la vânt puternic și intemperii? | Se montează exclusiv sticlă securizată de 8 mm sau 10 mm grosime, tratată termic pentru a rezista la șocuri mecanice mari și la rafale de vânt de peste 150–200 km/h. Între panouri se aplică garnituri transparente din policarbonat sau perii magnetice pentru etanșare împotriva ploii și prafului.',
    'Cât durează măsurătoarea, execuția și montajul? | După ce montatorul măsoară cu laser golul balconului, producția sticlei securizate la cotă durează între 2 și 3 săptămâni. Montajul propriu-zis al șinelor și al panourilor de sticlă pe balcon se efectuează într-o singură zi (4–7 ore).',
    'Care este diferența între sticla simplă securizată și geamul termopan pentru balcon? | Sticla securizată simplă oferă un aspect suplu, greutate redusă și protecție excelentă la ploaie, zăpadă și praf. Termopanul glisant (pachet dublu) oferă în plus izolare termică superioară, fiind recomandat celor care integrează balconul în living sau îl folosesc ca birou încălzit.',
  ],
  blocks: [
    node('hero', 'hero', {
      title: 'Închideri balcoane cu sticlă',
      subtitle: 'Sisteme glisante și pliabile fără rame verticale. Panoramă 100%, protecție la vânt și ploaie și izolare fonică pentru apartamentul tău.',
      buttonLabel: 'Cere oferte gratuite',
      checks: ['Sticlă securizată 8–10 mm', 'Fără rame vizibile', 'Firme verificate', 'Montaj în 1 zi'],
      bg: 'dark',
    }),
    node('facts', 'facts', {
      items: [
        { label: 'Deschidere balcon', value: 'Până la 100%' },
        { label: 'Durată montaj', value: '1 zi (4–7 ore)' },
        { label: 'Grosime sticlă', value: '8 – 10 mm securizată' },
        { label: 'Preț orientativ', value: '550–1.100 lei/mp' },
      ],
    }),
    node('intro', 'text', {
      body: para(
        'Un balcon închis cu sticlă glisantă fără rame transformă un spațiu nefolosit sau expus la praf și zgomot într-un loc confortabil de relaxare pe tot parcursul anului. Spre deosebire de tâmplăria PVC voluminoasă, panourile glisante din sticlă oferă transparență totală și pot fi pliate complet în zilele călduroase.',
        'Sistemul se adaptează oricărui tip de balcon – drept, în formă de L, în formă de U sau chiar curbat – greutatea fiind susținută de profilul inferior din aluminiu, fără a solicita tavanul.',
      ),
    }),
    node('types-h', 'heading', { text: 'Tipuri de sisteme de sticlă pentru balcon', level: 'h2' }),
    node('types', 'cards', {
      columns: '3',
      items: [
        { title: 'Sistem glisant-batant (armonică)', text: 'Panourile glisează pe șină și se rotesc la 90° în lateral, parcându-se compact. Permite deschiderea completă a balconului.' },
        { title: 'Sistem culisant paralel (multi-track)', text: 'Panourile glisează în linie pe 3, 4 sau 5 căi de rulare. Ideal pentru balcoane drepte cu spațiu restrâns la deschidere.' },
        { title: 'Sticlă termopan glisantă', text: 'Pachete termoizolante de sticlă dublă cu barieră fonică ridicată, ideale pentru balcoane transformate în spațiu de locuit.' },
        { title: 'Sistem fără prag (îngropat)', text: 'Șină inferioară minimalistă sau îngropată la nivelul pardoselii, pentru trecere lină și estetică impecabilă.' },
        { title: 'Sticlă securizată clară sau fumurie', text: 'Opțiuni de sticlă securizată ultra-clară, fumurie sau sablată pentru intimitate sporită față de vecini.' },
        { title: 'Accesorii de siguranță și încuietori', text: 'Sisteme de blocare pentru siguranța copiilor și încuietori cu cheie împotriva deschiderii accidentale.' },
      ],
    }),
    node('steps', 'steps', {
      title: 'Cum decurge lucrarea de închidere a balconului',
      items: [
        { title: 'Măsurători și consultanță tehnică', text: 'Specialistul verifică structura parapetului, planeitatea tavanului și măsoară cu laser dimensiunile exacte.' },
        { title: 'Debitarea și securizarea sticlei', text: 'Sticla este debitată la milimetru, prelucrată pe margini și securizată termic la cuptor.' },
        { title: 'Montajul șinelor din aluminiu', text: 'Fixarea mecanică sigură a profilelor superioare și inferioare și verificarea laser a nivelului.' },
        { title: 'Montarea și reglarea panourilor', text: 'Introducerea panourilor pe șine, instalarea garniturilor transparente și reglarea fină a glisării.' },
        { title: 'Etanșare și probă de funcționare', text: 'Etanșarea perimetrală la exterior împotriva apei și proba practică de deschidere completă.' },
      ],
    }),
    node('prices', 'price_table', {
      title: 'Prețuri orientative închidere balcon cu sticlă',
      note: 'Prețuri orientative în lei, fără TVA. Tariful final depinde de dimensiunea balconului, numărul de panouri, tipul de sticlă ales și înălțimea etajului.',
    }),
    node('choose-h', 'heading', { text: 'Cum alegi sistemul și firma potrivită', level: 'h2' }),
    node('choose', 'text', {
      body: para(
        'Cere întotdeauna detalii clare despre tipul de sticlă: asigură-te că este sticlă securizată veritabilă (cu marcaj laser în colțul fiecărui panou) de minim 8 mm grosime, nu sticlă flotată obișnuită.',
        'Verifică profilele din aluminiu: acestea trebuie să fie din aliaj structural 6063-T6, tratat anticoroziv și eloxat sau vopsit electrostatic în câmp termic.',
        'Solicită garanție scrisă atât pentru sistemul de feronerie și rulare (minim 5 ani), cât și pentru manopera de montaj și etanșare.',
      ),
    }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre închiderea balconului cu sticlă' }),
    node('areas', 'areas', { title: 'Unde găsești firme pentru închidere balcon cu sticlă' }),
    node('firms', 'firms_list', { limit: '6' }),
    node('form', 'request_form'),
  ],
}
