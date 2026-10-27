import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "garduri și pavaje": it presents the situations and sends to the guides and price pages (blocks that fill themselves with
 * what is published). It has no price table of its own: prices live in the dedicated price pages, so the page does not compete with them.
 */
export const gardurPavaje: ServiceContent = {
  slug: 'garduri-pavaje',
  hub: true,
  seoTitle: 'Garduri și pavaje: situații, soluții și firme verificate',
  seoDescription: 'Garduri, porți, pavaj de curte și beton amprentat: ce soluții există, cum alegi și cum compari ofertele. Ghiduri, prețuri și firme verificate.',
  summary: 'Garduri, porți, pavaj de curte și beton amprentat: ce soluții există, cum le alegi și cum compari ofertele firmelor.',
  sinonime: ['gard', 'garduri', 'amenajare curte', 'amenajări exterioare', 'împrejmuire', 'borduri'],
  preturi: [],
  intrebari: [
    'De ce depinde prețul unui gard? | De material, înălțime, lungime, tipul fundației, solul, accesul pentru utilaje și de poartă. Cere oferta cu materialul, fundația și poarta separate, ca să vezi unde diferă ofertele. Paginile de prețuri de mai jos explică factorii.',
    'Am nevoie de autorizație pentru gard? | Depinde de zonă, de tipul gardului și de poziția lui, mai ales spre stradă. Întreabă la primărie sau consultă regulamentul local înainte să începi, și vorbește cu vecinii dacă gardul urmează limita proprietății.',
    'Ce gard este mai durabil? | Durabilitatea depinde mai mult de fundație, de protecția anticorozivă la metal și de montaj decât de materialul văzut. Betonul și metalul bine protejat cer puțină întreținere; lemnul cere tratare periodică. Un specialist te poate sfătui după locul tău.',
    'Pavele sau beton amprentat? | Pavelele se pot scoate și repara pe bucăți și lasă apa să se scurgă prin rosturi. Betonul amprentat arată unitar, dar o fisură se repară mai greu. Pentru parcare, ambele cer o bază bine pregătită.',
    'Cum trebuie pregătit terenul pentru pavaj? | Se îndepărtează stratul vegetal, se compactează baza și se așază straturile de piatră și nisip, cu pante pentru scurgerea apei. Fără pregătire, pavajul se tasează în timp; stratul exact îl stabilește firma după sol și după trafic.',
    'Cât durează o lucrare de gard sau de pavaj? | Depinde de lungime sau suprafață, de sol, de număr de oameni din echipă și de vreme. Fundația trebuie lăsată să se întărească înainte de montaj, iar ploaia sau frigul pot amâna lucrarea. Cere termenul în ofertă.',
    'Cum compar ofertele pentru gard sau pavaj? | Pe aceleași criterii: materialul, fundația sau pregătirea bazei, poarta, evacuarea pământului și termenul. Nu te uita doar la prețul pe metru; o ofertă mult mai mică lasă de obicei deoparte un pas important.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Garduri, pavaje și amenajări exterioare', subtitle: 'Gard, poartă, pavaj de curte sau beton amprentat: ce soluții există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații', 'Firme verificate'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Vizită și trasare pe teren' },
      { label: 'Ce contează', value: 'Fundația și baza' },
      { label: 'Autorizare gard', value: 'Verifică la primărie' },
      { label: 'Compari', value: 'Material, fundație, poartă' },
    ] }),
    node('intro', 'text', { body: para(
      'Curtea și gardul sunt prima impresie a unei case și, în același timp, zone care suferă iarna, ploaia și traficul. Durabilitatea nu vine din materialul de la suprafață, ci din fundația gardului și din pregătirea terenului pentru pavaj.',
      'Pagina aceasta te ajută să identifici situația și te trimite la ghidul potrivit. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Gard metalic', text: 'Plasă bordurată, șipcă metalică sau tablă: diferențele dintre ele și ce presupune montajul.' },
      { title: 'Gard din beton', text: 'Plăci prefabricate și stâlpi: cum se montează, unde se potrivește și ce verifici la fundație.' },
      { title: 'Beton amprentat', text: 'Suprafață turnată cu model, pentru curte sau alei: rolul matrițelor și ce verifici la firmă.' },
      { title: 'Pavaj curte', text: 'Pavele și borduri: straturile de la bază, pantele pentru scurgerea apei și ordinea lucrărilor.' },
      { title: 'Poartă culisantă și automatizare', text: 'Culisantă sau batantă, ce motor și ce siguranță alegi, plus ce întrebi firma de montaj.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Garduri și pavaje pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre garduri și pavaje' }),
    node('prices', 'price_links', { title: 'Prețuri pentru garduri și pavaje' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea', items: [
      { title: 'Vizită și trasare', text: 'Firma măsoară, verifică limita proprietății și solul. Pentru gard, trasarea pe teren evită disputele cu vecinii.' },
      { title: 'Ofertă detaliată', text: 'Cere ofertă cu material, fundație și poartă separate, ca să vezi unde diferă ofertele.' },
      { title: 'Fundație sau pregătirea terenului', text: 'Săpătură și beton pentru gard; îndepărtarea stratului vegetal, compactare și strat de bază pentru pavaj.' },
      { title: 'Montaj', text: 'Stâlpi și panouri după întărirea fundației; pavele așezate cu rosturi uniforme sau beton turnat și amprentat.' },
      { title: 'Finisaje și recepție', text: 'Rostuire, borduri, vopsire sau sigilare. Verifici nivelul, pantele pentru scurgerea apei și alinierea.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere ofertă cu tot ce include: fundația, stâlpii, poarta, materialul și evacuarea pământului. Compară ofertele pe aceleași criterii, nu doar pe prețul pe metru.',
      'Întreabă ce fundație oferă și cum rezolvă scurgerea apei la pavaj. Aici se văd cele mai multe lucrări făcute ieftin.',
      'Cere poze cu lucrări mai vechi, ca să vezi cum au rezistat iernii. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre garduri și pavaje' }),
    node('firms', 'firms_list', { title: 'Firme de garduri și pavaje', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
