import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "hidroizolații": it presents the situations and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages, so the page does not compete with them.
 */
export const hidroizolatii: ServiceContent = {
  slug: 'hidroizolatii',
  hub: true,
  seoTitle: 'Hidroizolații: situații, soluții și firme verificate',
  seoDescription: 'Hidroizolații pentru baie, fundație, subsol, terasă și piscină: ce soluții există, cum alegi și cum compari ofertele. Ghiduri, prețuri și firme verificate.',
  summary: 'Baie, fundație, subsol, terasă, piscină sau igrasie: ce soluții de hidroizolație există, cum le alegi și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Ce înseamnă hidroizolație și de ce este necesară? | Este un strat sau un sistem care oprește apa să pătrundă în beton, zidărie sau planșeu. Fără ea apar igrasia, mucegaiul, infiltrațiile la vecini sau la tavan și, în timp, degradarea structurii. Se face la construcție și se reface când stratul vechi cedează.',
    'Ce tipuri de hidroizolație există? | În linii mari: membrane (bituminoase sau sintetice, de exemplu EPDM), produse lichide (bituminoase, poliuretanice, cimentoase flexibile) și soluții speciale, cum sunt mortarele hidroizolante pentru interior. Fiecare se potrivește altor situații; ghidurile de mai jos explică alegerea.',
    'Cum aleg soluția potrivită situației mele? | Pornește de la loc (baie, fundație, terasă, piscină), de la presiunea apei, de la ce se pune deasupra și de accesul la suprafață. Un diagnostic făcut de o firmă înainte de ofertă evită cumpărarea unui produs nepotrivit.',
    'Cât costă o hidroizolație? | Depinde de suprafață, de starea suportului, de soluția aleasă, de accesul pentru lucrări și de ce se pune deasupra. Compară ofertele pe conținut: produsul exact, numărul de straturi, racordurile incluse și garanția. Paginile de prețuri de mai jos explică factorii.',
    'Pot face hidroizolația singur? | Pe suprafețe mici și accesibile, urmând fișa tehnică, uneori da. Pentru fundații, terase mari, subsoluri sau băi în bloc, lucrarea cere firmă: o greșeală se vede abia când apa pătrunde, uneori la vecini.',
    'Ce garanție ar trebui să ofere firma? | Cere garanția pentru manoperă în scris și documentele produselor folosite. Hidroizolația nu se mai vede după acoperire, deci fotografiile din fiecare etapă sunt o dovadă utilă dacă apar probleme.',
  ],
  sinonime: ['hidroizolație', 'hidroizolare', 'impermeabilizare', 'igrasie', 'infiltrații', 'membrană', 'hidroizolație lichidă'],
  blocks: [
    node('hero', 'hero', { title: 'Hidroizolații', subtitle: 'Baie, fundație, subsol, terasă sau piscină: ce soluții există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Diagnostic al sursei de apă' },
      { label: 'Ce alegi', value: 'Soluția potrivită locului' },
      { label: 'Compari', value: 'Produs, straturi, garanție' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'Hidroizolația este stratul pe care nu îl vezi, dar care decide dacă o baie, o fundație sau o terasă ține zeci de ani sau dacă apar pete, mucegai și infiltrații. O soluție bună se alege pentru situația concretă: un produs potrivit pentru baie nu este același cu cel pentru o fundație sau pentru o terasă.',
      'Pagina aceasta te ajută să identifici situația și te trimite la ghidul potrivit. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Baie și spații umede', text: 'Hidroizolația se face sub gresie și faianță, cu bandă în colțuri și test cu apă. Ghidul explică unde și în câte straturi.' },
      { title: 'Fundație, subsol, beci', text: 'Soluția recomandată este pe exterior, cu protecție și drenaj; pe interior se lucrează ca remediere, când nu se poate săpa.' },
      { title: 'Igrasie și infiltrații', text: 'Mai întâi se stabilește sursa apei, apoi se tratează cauza; vopseaua peste un perete umed nu rezolvă nimic.' },
      { title: 'Terasă și acoperiș plat', text: 'Contează pantele, racordurile la parapet și scurgerile, alături de tipul de membrană sau produs lichid.' },
      { title: 'Membrane: EPDM sau bituminoase', text: 'Două soluții frecvente pentru suprafețe mari, cu avantaje și limite diferite; compară-le înainte să alegi.' },
      { title: 'Hidroizolație lichidă', text: 'Strat continuu, fără îmbinări, util pe forme complicate, la băi, terase și fundații; alegi tipul după loc.' },
    ] }),
    node('guides', 'guide_links', { title: 'Ghiduri pe situații' }),
    node('prices', 'price_links', { title: 'Prețuri pentru hidroizolații' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Diagnostic și vizită', text: 'Firma vede locul, stabilește de unde vine apa și ce soluție se potrivește. Oferta trebuie să pornească de aici.' },
      { title: 'Ofertă detaliată', text: 'Cere produsul exact, numărul de straturi, racordurile incluse, termenul și garanția. Compară oferte cu același conținut.' },
      { title: 'Contract și avans', text: 'Contract scris cu garanția pentru manoperă. Evită plata integrală în avans.' },
      { title: 'Execuție', text: 'Pregătirea suportului, hidroizolația, racordurile și protecția, cu fotografii din fiecare etapă.' },
      { title: 'Verificare și recepție', text: 'Test cu apă acolo unde se poate, verificarea racordurilor și primirea garanției scrise.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: produsul și straturile, pregătirea suportului, racordurile, termenul și garanția. O ofertă mult mai mică lasă de obicei deoparte un pas important, de pildă bandă de etanșare, testul cu apă sau drenajul.',
      'Întreabă ce lucrări similare a făcut firma și cere, dacă se poate, referințe. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre hidroizolații' }),
    node('firms', 'firms_list', { title: 'Firme de hidroizolații' }),
    node('form', 'request_form', {}),
  ],
}
