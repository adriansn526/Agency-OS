import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "terase, pergole și foișoare": it presents the situations and sends to the guides and price pages (blocks that fill themselves
 * with what is published). It has no price table of its own: prices live in the dedicated price pages, so the page does not compete with them.
 */
export const tersePergoleFoisoare: ServiceContent = {
  slug: 'terase-pergole-foisoare',
  hub: true,
  seoTitle: 'Terase, pergole și foișoare: soluții și firme verificate',
  seoDescription: 'Terase din lemn sau WPC, pergole, foișoare și închideri de terasă: ce soluții există, cum alegi, ce întrebi și cum compari ofertele. Ghiduri, prețuri și firme.',
  summary: 'Pergole, foișoare, terase de tip deck și închideri de terasă sau balcon: ce soluții există, cum le alegi și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Ce lucrări intră la terase, pergole și foișoare? | Structuri exterioare pentru odihnă și masă: pardoseli de tip deck din lemn sau WPC, pergole din lemn sau aluminiu, sisteme retractabile și bioclimatice, foișoare de grădină și închideri ale teraselor și balcoanelor cu sticlă, folie sau rulouri.',
    'De unde încep când vreau să amenajez o terasă? | De la ce vrei să faci pe ea: loc de masă, umbră, grătar, spațiu folosit și toamna. Din răspuns decurg alegerile: pardoseala, umbrirea, închiderea. Apoi verifici ce acte pot fi necesare și ceri oferte de la mai multe firme.',
    'Am nevoie de autorizație? | Depinde de tipul structurii, de dimensiune, de zonă și de dacă locuiești la casă sau la bloc. Reglementările locale diferă, deci întreabă la primărie înainte să comanzi, iar la bloc și la asociație. Pagina fiecărei situații explică ce să întrebi.',
    'Pot face singur o terasă sau o pergolă? | Pe suprafețe mici și lucrări simple, urmând instrucțiunile producătorului, uneori da. Pentru structuri mari, pentru lucrări la înălțime sau cu instalații electrice e mai sigur să apelezi la o firmă, iar partea electrică se face de personal autorizat.',
    'Cum compar ofertele? | Cere ofertele în scris, cu materialul, dimensiunile, fundarea sau structura, finisajele și ce este inclus: transport, montaj, curățenie. Compară doar oferte care descriu aceeași lucrare și întreabă despre garanție și service.',
    'De ce diferă atât de mult ofertele? | Pentru că materialele, structura de dedesubt, finisajele și accesoriile diferă, iar ofertele fără detalii nu se pot compara. Costul depinde de dimensiune, de material, de complexitatea formei, de fundare și de montaj. Paginile de preț explică ordinele de mărime.',
  ],
  sinonime: ['terasa', 'terase', 'amenajare terasa', 'amenajari terase', 'amenajare terasa exterioara', 'terasa casa', 'terasă', 'amenajare terasă', 'amenajări terase', 'amenajare terasă exterioară', 'terasă casă'],
  blocks: [
    node('hero', 'hero', { title: 'Terase, pergole și foișoare', subtitle: 'Terasă din lemn sau WPC, pergolă, foișor sau închidere de terasă: ce soluții există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Ce vrei să faci pe terasă' },
      { label: 'Acte', value: 'Depind, întreabă la primărie' },
      { label: 'Compari', value: 'Material, structură, montaj' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'Terasa, pergola și foișorul sunt locul în care se mută o parte din viața casei în sezonul cald. O lucrare bine gândită se vede în aspect, dar mai ales în felul în care rezistă la ploaie, soare și vânt, deci contează structura, materialele și execuția, nu doar modelul.',
      'Pagina te ajută să identifici situația și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Pergolă din lemn sau aluminiu', text: 'Structură deschisă pentru umbră și delimitare. Pagina explică diferențele dintre materiale, ce întrebi și cum compari ofertele.' },
      { title: 'Pergolă retractabilă și bioclimatică', text: 'Sisteme cu pânză sau lamele reglabile. Contează limitele la vânt și ploaie, acționarea și service-ul.' },
      { title: 'Foișor din lemn pentru grădină', text: 'Construcție cu acoperiș propriu. Contează lemnul, tratamentul, fundarea și actele necesare.' },
      { title: 'Terasă din lemn sau WPC (deck)', text: 'Pardoseală exterioară pe structură aerisită. Contează materialul, structura dedesubt și scurgerea apei.' },
      { title: 'Închidere terasă și balcon', text: 'Sticlă, folie, rulouri sau tâmplărie. Contează soluția, actele și aerisirea.' },
      { title: 'Acoperiș peste terasă', text: 'Acoperirea fixă a unei terase are pagina ei, la categoria de acoperișuri.' },
    ] }),
    node('choose-h-h', 'heading', { text: 'Cum alegi soluția', level: 'h2' }),
    node('choose-sol', 'text', { body: para(
      'Pornește de la funcție: dacă ai nevoie doar de umbră, o pergolă poate fi suficientă; dacă vrei protecție la ploaie, intră în discuție sistemele cu acoperire sau acoperișul fix; dacă vrei să folosești spațiul și toamna, urmează închiderea. Fiecare pas adaugă costuri, mentenanță și, uneori, acte.',
      'Materialul se alege după buget, aspect și cât efort vrei să depui în întreținere. Lemnul cere tratare periodică; aluminiul și WPC-ul cer de obicei mai puțină întreținere, dar au limitele lor.',
    ) }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Idee și vizită', text: 'Firma vede locul, discută ce vrei și propune soluția. Oferta ar trebui să pornească de aici, nu doar de la o poză.' },
      { title: 'Ofertă detaliată', text: 'Cere materialul, dimensiunile, fundarea sau structura, finisajele, termenul și garanția. Compară oferte cu același conținut.' },
      { title: 'Acte și acorduri', text: 'Verifici la primărie, iar la bloc la asociație, dacă lucrarea cere acte sau acord.' },
      { title: 'Contract și avans', text: 'Contract scris, cu termene și garanție. Evită plata integrală în avans.' },
      { title: 'Execuție', text: 'Fundare sau structură, montaj, finisaje, cu verificări la fiecare etapă.' },
      { title: 'Recepție', text: 'Verifici stabilitatea, finisajele și funcționarea și primești în scris garanția și instrucțiunile de întreținere.' },
    ] }),
    node('choose-firm-h-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose-firm', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: material, structură, fundare, finisaje, termen și garanție. O ofertă mult mai mică lasă de obicei deoparte un element important, de pildă tratamentul, fundarea sau scurgerea apei.',
      'Întreabă ce lucrări similare a făcut firma și cere, dacă se poate, să le vezi. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre terase, pergole și foișoare' }),
    node('prices', 'price_links', { title: 'Prețuri pentru terase, pergole și foișoare' }),
    node('situation-links', 'situation_links', { title: 'Terase, pergole și foișoare pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
