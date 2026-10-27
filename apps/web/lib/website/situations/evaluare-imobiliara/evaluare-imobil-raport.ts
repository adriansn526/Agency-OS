import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const evaluareImobilRaport: SituationContent = {
  slug: 'evaluare-imobiliara--evaluare-imobil-raport',
  categorie: 'evaluare-imobiliara',
  title: 'Evaluare imobiliară: raport ANEVAR',
  seoTitle: 'Evaluare imobiliară: raport ANEVAR, ce să știi',
  seoDescription: 'Cum comanzi o evaluare imobiliară: rolul evaluatorului autorizat ANEVAR, scopul raportului, ce documente ceri și de ce depinde costul. Cum compari ofertele.',
  summary: 'Ce este o evaluare imobiliară, cine o face, cum depinde raportul de scop și ce să întrebi evaluatorului înainte să comanzi.',
  sinonime: ['evaluator imobiliar', 'evaluator anevar', 'evaluare imobiliara', 'evaluare apartament', 'evaluare imobil', 'evaluari imobile', 'raport de evaluare', 'pret evaluare imobiliara', 'evaluator anevar pret', 'evaluare imobiliară', 'evaluări imobile', 'preț evaluare imobiliară', 'evaluator anevar preț'],
  intrebari: [
    'Ce este o evaluare imobiliară? | O estimare a valorii unui imobil (apartament, casă, teren, spațiu comercial), întocmită de un evaluator autorizat într-un raport scris. Nu este o simplă părere: se bazează pe analiza imobilului, a pieței și a documentelor.',
    'Cine poate face evaluarea? | Un evaluator autorizat, membru al asociației profesionale din domeniu (ANEVAR). Cere dovada autorizării și verifică-o la asociația profesională, ca raportul să fie acceptat de cel căruia i-l prezinți.',
    'La ce folosește raportul? | Depinde de scop: credit la bancă, vânzare sau cumpărare, impozitare, succesiune, partaj, asigurare, litigiu. Raportul se întocmește pentru un scop declarat, iar un raport făcut pentru un scop nu se folosește automat pentru altul.',
    'Banca acceptă orice evaluator? | De obicei nu. Băncile lucrează cu evaluatori sau firme aprobate de ele. Dacă raportul e pentru credit, întreabă banca ce evaluatori acceptă înainte să comanzi.',
    'Ce documente îi dau evaluatorului? | Acte de proprietate, extras de carte funciară, plan sau schițe, certificat energetic și alte documente privind imobilul, după caz. Evaluatorul îți spune lista exactă și poate inspecta imobilul.',
    'Evaluatorul inspectează imobilul? | De regulă da, pentru a vedea starea și caracteristicile reale. Metodele și limitele inspecției se menționează în raport. Răspunde sincer la întrebări și semnalează modificările făcute.',
    'De ce depinde costul? | De tipul și complexitatea imobilului, de scopul raportului, de documentele disponibile, de deplasare și de urgență. Cere o ofertă scrisă care spune ce intră în ea și pentru ce scop se face raportul.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Evaluare imobiliară: cum comanzi un raport de la un evaluator autorizat', subtitle: 'Scopul raportului, documentele necesare și ce să întrebi. Cere oferte gratuite de la evaluatori verificați.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine face', value: 'Evaluator autorizat ANEVAR' },
      { label: 'Esențial', value: 'Scopul raportului' },
      { label: 'Ce ceri', value: 'Ofertă scrisă' },
      { label: 'Banca', value: 'Întreabă ce evaluatori acceptă' },
    ] }),
    node('intro', 'text', { body: para(
      'Evaluarea imobiliară stabilește, într-un raport scris, valoarea unui imobil pentru un scop precis. Contează la credite, vânzări, moșteniri, partaje, asigurări sau litigii, iar rezultatul depinde de scopul declarat și de documentele prezentate.',
      'Pagina te ajută să știi cine face evaluarea, ce întrebi înainte să comanzi și de ce depinde costul. Pentru lucrări de construcție, vezi celelalte categorii din site.',
    ) }),
    node('what-h', 'heading', { text: 'Pentru ce se face evaluarea', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Credit ipotecar', text: 'Banca cere un raport de la un evaluator pe care îl acceptă; întreabă înainte de comandă.' },
      { title: 'Vânzare sau cumpărare', text: 'Ajută la stabilirea unui preț fundamentat, pentru ambele părți.' },
      { title: 'Succesiune sau partaj', text: 'Valoarea contează la împărțirea bunurilor între moștenitori sau coproprietari.' },
      { title: 'Impozitare, asigurare, litigii', text: 'Fiecare scop are cerințe proprii; evaluatorul te îndrumă.' },
    ] }),
    node('mat-h', 'heading', { text: 'Ce conține și cum se întocmește raportul', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Raportul descrie imobilul, scopul evaluării, metodele folosite, datele de piață analizate și concluzia. Evaluatorul poate inspecta imobilul și verifică documentele. Valoarea este valabilă pentru scopul și data pentru care a fost făcută.',
      'Dacă raportul urmează să fie prezentat unei instituții, întreabă-o din timp ce cerințe are. Termenul în care poate fi folosit un raport depinde de acea instituție, deci nu presupune; întreabă la banca sau autoritatea respectivă.',
    ) }),
    node('steps', 'steps', { title: 'Cum decurge comanda', items: [
      { title: 'Stabilești scopul', text: 'Banca, vânzarea, succesiunea sau altceva: scopul determină conținutul raportului.' },
      { title: 'Alegi evaluatorul', text: 'Verifici autorizarea și, dacă e cazul, aprobarea băncii.' },
      { title: 'Oferta și contractul', text: 'Cu scopul, documentele cerute, termenul și costul scrise.' },
      { title: 'Inspecția și documentele', text: 'Evaluatorul vede imobilul și analizează actele.' },
      { title: 'Raportul', text: 'Primești raportul scris și poți cere clarificări.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Scop nedeclarat sau greșit', text: 'Un raport făcut pentru alt scop poate fi respins.' },
      { title: 'Evaluator neacceptat de bancă', text: 'Raportul trebuie refăcut, cu timp și costuri în plus.' },
      { title: 'Documente incomplete', text: 'Duc la întârzieri sau la rezerve în raport.' },
      { title: 'Ascunderea modificărilor', text: 'Extinderi sau schimbări neînregistrate afectează valoarea.' },
      { title: 'Alegerea după preț', text: 'Verifică autorizarea și experiența, nu doar costul.' },
      { title: 'Așteptări greșite', text: 'Evaluarea nu garantează prețul de vânzare.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de tipul și complexitatea imobilului, de scopul raportului, de documentele disponibile, de deplasare și de urgență. Un teren sau un spațiu comercial se evaluează diferit față de un apartament.',
      'Cere o ofertă scrisă care spune ce intră în ea. Pentru ordin de mărime, vezi paginile de preț.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi evaluatorul', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere dovada autorizării, întreabă ce experiență are cu tipul tău de imobil și dacă lucrează cu banca ta, dacă raportul e pentru credit. Cere exemple de structură a raportului.',
      'Clarifică de la început scopul, documentele, ce cuprinde oferta și când primești raportul. Compară ofertele pe aceleași criterii.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre evaluarea imobiliară' }),
    node('prices', 'price_links', { title: 'Prețuri pentru evaluări' }),
    node('situation-links', 'situation_links', { title: 'Alte situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de o evaluare?', text: 'Descrie imobilul și scopul și primești oferte de la evaluatori verificați din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
