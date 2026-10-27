import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "fundații și beton": it presents the situations and sends to the guides and price pages (blocks that fill themselves with
 * what is published). It has no price table of its own: prices live in the dedicated price pages, so the page does not compete with them.
 */
export const fundatiiBeton: ServiceContent = {
  slug: 'fundatii-beton',
  hub: true,
  seoTitle: 'Fundații și beton: situații, ghiduri și firme verificate',
  seoDescription: 'Fundații de casă, plăci și șape din beton: ce lucrări există, ce hotărăște proiectantul și cum compari ofertele. Ghiduri, prețuri și firme verificate.',
  summary: 'Fundații, șape și plăci din beton armat: ce presupun lucrările, ce stabilește proiectantul și cum compari ofertele firmelor.',
  sinonime: ['fundație', 'radier', 'cofraj', 'armare', 'lucrări din beton'],
  preturi: [],
  intrebari: [
    'Cât costă turnarea betonului? | Depinde de volum, de clasa de beton cerută de proiect, de distanța de la stație, de accesul pentru autobetonieră sau pompă și de manoperă. Compară ofertele pe conținut, cu betonul, pompa, oțelul și manopera pe rânduri separate. Pagina de prețuri pentru turnarea betonului de fundație explică factorii.',
    'Ce adâncime trebuie să aibă fundația? | O stabilește proiectantul de structuri, pe baza studiului geotehnic și a condițiilor locului. Nu există o valoare valabilă pentru orice teren, deci o ofertă care pornește de la o adâncime „standard”, fără studiu, rămâne o estimare.',
    'Am nevoie de studiu geotehnic? | Pentru o construcție nouă, da: studiul face parte din proiect și stă la baza alegerii tipului de fundație. Cere-l înainte de ofertele de execuție, ca firmele să ofere pe aceeași bază.',
    'Fundație continuă sau radier? | Alegerea depinde de teren, de apa din sol și de încărcările casei, iar decizia aparține proiectantului de structuri. Ghidul despre fundația casei explică tipurile uzuale și criteriile, fără să înlocuiască proiectul.',
    'Pot turna beton iarna sau pe vreme foarte caldă? | La frig puternic și la căldură mare betonul cere măsuri speciale de protecție și întreținere, iar uneori turnarea se amână. O firmă serioasă îți spune dacă momentul este potrivit și ce măsuri ia, iar proiectantul are ultimul cuvânt.',
    'Când pot continua lucrările după turnare? | Betonul trebuie lăsat să se întărească și să fie întreținut, iar momentul în care se decofrează sau se încarcă îl stabilește proiectantul sau dirigintele de șantier, după tipul elementului și condițiile de vreme.',
    'Ce verific la recepția unei lucrări din beton? | Armătura înainte de turnare, bonul de livrare al betonului, probele prelevate și nivelurile. Cere ca lucrările ascunse să fie consemnate într-un proces-verbal semnat de diriginte, pentru că după turnare nu mai poți vedea armătura.',
    'Cine face hidroizolația fundației? | Este o lucrare separată, tratată în categoria de hidroizolații. Întreabă dacă oferta de fundație o include sau dacă trebuie contractată distinct, ca să nu rămână necuprinsă între două oferte.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Fundații și lucrări din beton', subtitle: 'Fundații de casă, șape și plăci din beton armat. Descrie lucrarea și primești oferte de la firme verificate, gratuit.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații', 'Firme verificate'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Proiect și studiu geotehnic' },
      { label: 'Dimensionarea', value: 'O stabilește proiectantul' },
      { label: 'Compari', value: 'Beton, oțel, pompă, manoperă' },
      { label: 'Recepție', value: 'Proces-verbal de lucrări ascunse' },
    ] }),
    node('intro', 'text', { body: para(
      'Fundația este partea casei pe care nu o mai poți repara ușor. Defectele apar după luni sau ani: fisuri, tasări, igrasie. De aceea contează proiectul, armarea corectă, calitatea betonului și respectarea timpilor de întărire.',
      'Pagina aceasta te ajută să identifici situația (fundația casei, șapa mecanizată sau autonivelantă, placa de beton armat) și te trimite la ghidul potrivit. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Fundația casei', text: 'Tipul fundației și dimensionarea le stabilește proiectantul pe baza studiului geotehnic; ghidul explică tipurile uzuale și ordinea lucrărilor.' },
      { title: 'Șapă mecanizată', text: 'Șapa de egalizare pusă cu utilaj acoperă repede suprafețe mari; contează planeitatea cerută și accesul utilajului.' },
      { title: 'Șapă autonivelantă', text: 'Se potrivește când ai nevoie de o suprafață foarte plană sub pardoseala finală; verifică suportul și fișa produsului înainte de ofertă.' },
      { title: 'Placă de beton armat', text: 'Rolul armării și al întreținerii betonului decide dacă placa fisurează; ghidul explică execuția și cum compari ofertele.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Fundații și beton pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre fundații și beton' }),
    node('prices', 'price_links', { title: 'Prețuri pentru fundații și beton' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Proiect și studiu geotehnic', text: 'Proiectantul stabilește tipul fundației și dimensiunile. Fără studiu geotehnic, oferta rămâne o estimare.' },
      { title: 'Ofertă detaliată', text: 'Cere materialele separate de manoperă: beton, oțel, pompă, evacuarea pământului, plus termenul și garanția în scris.' },
      { title: 'Contract și avans', text: 'Contract scris, cu etapele lucrării. Evită plata integrală în avans.' },
      { title: 'Execuție și control', text: 'Trasare, săpătură, cofraj, armare și turnare. Armătura se verifică înainte de turnare, împreună cu dirigintele de șantier.' },
      { title: 'Recepție', text: 'Bonurile de livrare, probele de beton și procesul-verbal de lucrări ascunse, semnate înainte de a continua.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere ofertă pe baza proiectului și a studiului geotehnic, cu materialele separate de manoperă. Compară ofertele pe aceleași criterii: ce intră în preț, cine răspunde de armare, cine ține evidența bonurilor de livrare și a probelor de beton.',
      'Evită ofertele fără proiect sau care promit turnarea imediat, fără verificarea săpăturii. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre fundații și beton' }),
    node('areas', 'areas', { title: 'Unde găsești firme pentru fundații și beton' }),
    node('firms', 'firms_list', { title: 'Firme pentru fundații și beton', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca lucrarea să o facă o firmă?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
