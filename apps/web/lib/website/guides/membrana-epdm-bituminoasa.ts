import { node, para, type GuideContent } from './types'

export const membranaEpdmBituminoasa: GuideContent = {
  slug: 'membrana-epdm-sau-bituminoasa',
  serviciu: 'hidroizolatii',
  title: 'Membrană EPDM sau bituminoasă: diferențe și cum alegi',
  seoTitle: 'Membrană EPDM sau bituminoasă: diferențe și alegere',
  seoDescription: 'EPDM sau membrană bituminoasă pentru terasă și acoperiș plat: cum se montează fiecare, avantaje, limite, ce întrebi firma și când alegi una sau alta.',
  summary: 'Comparație între membrana EPDM și cea bituminoasă: cum se montează, ce avantaje și limite are fiecare și ce criterii folosești ca să alegi.',
  keyword: 'membrana epdm',
  keywords: ['membrana epdm', 'epdm membrana', 'folie epdm', 'membrana bituminoasa', 'membrana bituminoasa autoadeziva', 'hidroizolatie bituminoasa', 'membrana hidroizolatie', 'folie hidroizolatie'],
  intrebari: [
    'Care este diferența de bază dintre EPDM și membrana bituminoasă? | EPDM este o membrană din cauciuc sintetic, livrată în foi mari, cu puține îmbinări. Membrana bituminoasă are la bază bitum modificat, se montează în foi mai înguste și are mai multe îmbinări. Se montează diferit, au alt comportament la cald și la frig și alte puncte slabe.',
    'Care ține mai mult? | Durata de viață depinde mai mult de montaj, de pante și de întreținere decât de material. Producătorii declară durate diferite, dar valorile nu se pot compara direct: cere garanția scrisă pentru material și pentru manoperă și întreabă ce acoperă.',
    'Care este mai ușor de reparat? | Ambele se pot repara punctual dacă firma are materialele și experiența potrivite. Membrana bituminoasă se repară des cu peticiri; EPDM cere produse compatibile și o suprafață curată. Întreabă firma cum se face o reparație ulterioară.',
    'Este periculoasă montarea cu flacără? | Membranele bituminoase termosudate se montează cu flacără deschisă, ceea ce cere echipă pregătită, măsuri de siguranță și atenție la materialele inflamabile din apropiere. Există și variante autoadezive sau lipite, fără flacără.',
    'Se potrivește EPDM pe o terasă circulabilă? | Se poate, cu un strat de protecție sau de uzură adecvat deasupra, la fel ca la alte membrane. Cere firmei să spună ce se pune deasupra și cum se protejează membrana la circulație.',
    'Pot monta singur o membrană? | Pe suprafețe mici și simple este posibil cu ajutorul fișelor tehnice. Pe terase mari, cu racorduri multe sau pe un bloc, lucrarea cere firmă: o greșeală la racorduri se vede abia la prima ploaie serioasă.',
    'Ce întreb firma înainte să aleg? | Ce produs exact folosește și în câte straturi, cum se fac îmbinările și racordurile, ce garanție oferă, cine a mai montat aceeași soluție în zonă și ce se întâmplă dacă apar infiltrații în primii ani.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Membrană EPDM sau bituminoasă: diferențe și cum alegi', subtitle: 'Cum se montează fiecare, ce avantaje și limite are și ce întrebi firma. Dacă preferi să ceri oferte, o poți face gratuit.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'EPDM', value: 'Foi mari, puține îmbinări' },
      { label: 'Bituminoasă', value: 'Foi înguste, mai multe îmbinări' },
      { label: 'Ce decide durata', value: 'Montajul și racordurile' },
      { label: 'Cere', value: 'Garanție scrisă' },
    ] }),
    node('intro', 'text', { body: para(
      'Pentru terase și acoperișuri plate, membranele bituminoase și cele din EPDM sunt printre cele mai întâlnite soluții. Amândouă pot funcționa foarte bine și amândouă pot da probleme dacă sunt montate prost, așa că alegerea nu este între „bun” și „rău”, ci între două soluții cu alte puncte forte și alte riscuri.',
      'Mai jos le compari pe aspectele care contează în practică: cum se montează, câte îmbinări au, cum se repară și ce trebuie să ceri în ofertă.',
    ) }),
    node('cmp-h', 'heading', { text: 'Comparația, pe scurt', level: 'h2' }),
    node('cmp', 'cards', { columns: '2', items: [
      { title: 'EPDM: cum se montează', text: 'Foi mari din cauciuc sintetic, lipite, fixate mecanic sau ținute cu balast. Puține îmbinări, deci mai puține puncte slabe.' },
      { title: 'Bituminoasă: cum se montează', text: 'Foi cu bitum modificat, termosudate cu flacără sau autoadezive, în unul sau două straturi. Mai multe îmbinări de verificat.' },
      { title: 'EPDM: ce cere', text: 'Suprafață curată și produse compatibile pentru lipire și reparații. Echipa trebuie să cunoască sistemul, mai puțin răspândit.' },
      { title: 'Bituminoasă: ce cere', text: 'Echipă obișnuită cu flacăra și cu măsurile de siguranță, sau variante fără flacără. Este soluția cunoscută de majoritatea firmelor.' },
      { title: 'EPDM: puncte de atenție', text: 'Racordurile, îmbinările lipite și protecția la circulația de pe terasă.' },
      { title: 'Bituminoasă: puncte de atenție', text: 'Îmbinările dintre foi, racordurile la parapet și siguranța la montajul cu flacără.' },
    ] }),
    node('pick-h', 'heading', { text: 'Când alegi una sau alta', level: 'h2' }),
    node('pick', 'text', { body: para(
      'Pe suprafețe mari și drepte, cu puține ieșiri, foile mari de EPDM reduc numărul de îmbinări. Pe terase mici sau complicate, cu multe racorduri, orice sistem se decide după detalii; o firmă bună îți arată cum rezolvă racordul la parapet și la scurgere, nu doar ce produs pune.',
      'Nu alege după preț sau după ce este mai „la modă”: alege firma care știe să monteze sistemul respectiv, cu o garanție scrisă. O soluție mai bună pe hârtie, montată de o echipă fără experiență în ea, are șanse mai mici decât una obișnuită, montată corect.',
    ) }),
    node('steps', 'steps', { title: 'Ce verifici în oferta firmei', items: [
      { title: 'Produsul și straturile', text: 'Marca, grosimea și numărul de straturi, scrise în ofertă, nu doar „membrană”.' },
      { title: 'Suportul și pantele', text: 'Dacă oferta include pregătirea suportului, refacerea pantelor și curățarea scurgerilor.' },
      { title: 'Îmbinările și racordurile', text: 'Cum se fac îmbinările și racordurile la parapete, scurgeri și ieșiri de țevi.' },
      { title: 'Protecția deasupra', text: 'Ce se pune peste membrană și cine îl montează, mai ales pe terase circulabile.' },
      { title: 'Garanția', text: 'Garanție scrisă pentru manoperă și documentele produselor, cu ce acoperă și ce o anulează.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Prețul depinde de suprafață, de starea suportului, de numărul de racorduri și scurgeri, de grosimea și marca membranei și de ce se montează deasupra. Compară ofertele pe aceleași criterii și vezi pagina de prețuri pentru membrana EPDM.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre EPDM și membrana bituminoasă' }),
    node('prices', 'price_links', { title: 'Prețuri pentru hidroizolații' }),
    node('guides', 'guide_links', { title: 'Alte ghiduri despre hidroizolații' }),
    node('cta', 'request_cta', { title: 'Vrei oferte pentru montaj?', text: 'Descrie terasa și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
