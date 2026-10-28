import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const inchiriereBuldoexcavatorMiniexcavator: SituationContent = {
  slug: 'inchirieri-utilaje-schele--inchiriere-buldoexcavator-miniexcavator',
  categorie: 'inchirieri-utilaje-schele',
  title: 'Închiriere buldoexcavator, miniexcavator și macara',
  seoTitle: 'Închiriere buldoexcavator, miniexcavator și macara',
  seoDescription: 'Cum închiriezi buldoexcavator, miniexcavator sau macara: cu operator, ce asigurări contează, ce lucrări se fac, de ce depinde costul și cum compari ofertele.',
  summary: 'Ce să știi când închiriezi un utilaj de construcții: operator calificat, asigurări, acces pe teren, contract și ce să compari în oferte.',
  sinonime: ['inchirieri buldoexcavator', 'inchiriez buldoexcavator', 'inchirieri buldoexcavatoare', 'buldoexcavator de inchiriat', 'inchiriere miniexcavator', 'miniexcavator de inchiriat', 'inchiriere buldoexcavator', 'inchirieri utilaje', 'inchiriez utilaje', 'inchiriere utilaje constructii', 'inchiriere macara', 'inchirieri macara', 'închirieri buldoexcavator', 'închiriez buldoexcavator', 'închirieri buldoexcavatoare', 'buldoexcavator de închiriat', 'închiriere miniexcavator', 'miniexcavator de închiriat', 'închiriere buldoexcavator', 'închirieri utilaje', 'închiriez utilaje', 'închiriere utilaje construcții', 'închiriere macara', 'închirieri macara'],
  intrebari: [
    'Închiriez utilajul cu sau fără operator? | De regulă, cu operator. Utilajele de construcții se conduc de persoane calificate și autorizate pentru tipul respectiv de utilaj, iar o greșeală poate provoca accidente sau daune. Dacă firma oferă și varianta fără operator, întreabă ce condiții și ce asigurări cere.',
    'Ce utilaj este potrivit lucrării mele? | Depinde de tipul și volumul lucrării, de spațiul de manevră și de teren. Miniexcavatorul intră în spații mai strâmte, buldoexcavatorul face lucrări mai ample, iar macaraua ridică și mută încărcături. Descrie lucrarea firmei și lasă-o să recomande.',
    'Ce asigurări trebuie să existe? | Utilajul și operatorul trebuie să fie acoperite de asigurări pentru daune și accidente. Cere firmei să-ți spună ce acoperă ele și cine răspunde pentru daune produse pe terenul tău sau la vecini.',
    'Am nevoie de autorizație pentru lucrările cu utilaj? | Depinde de lucrare. Săpăturile, ocuparea trotuarului sau a drumului și ridicările cu macara pot cere acte sau aprobări. Întreabă la primărie și la firma care execută, înainte de începere.',
    'Pe ce lucrări se folosesc aceste utilaje? | Săpături pentru fundații, șanțuri, nivelări, demolări, încărcări și transport de materiale, ridicarea și așezarea de elemente grele. Fiecare cere un utilaj și un operator potrivit.',
    'Ce verific înainte să încep lucrarea? | Rețelele subterane de pe teren (apă, gaz, electricitate, canalizare), accesul utilajului, stabilitatea solului și vecinătățile. Cere informații de la furnizorii de utilități și vorbește cu firma despre riscuri.',
    'De ce depinde costul? | De tipul utilajului, de durata folosirii, de transport, de operator, de combustibil, de condițiile de lucru și de eventualele asigurări. Cere oferte care detaliază fiecare element și vezi paginile de preț.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Închiriere utilaje de construcții: ce să verifici în ofertă', subtitle: 'Buldoexcavator, miniexcavator sau macara, cu operator calificat. Asigurări, acces și contract. Cere oferte gratuite de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Utilaje', value: 'Buldoexcavator, miniexcavator, macara' },
      { label: 'Operator', value: 'Calificat și autorizat' },
      { label: 'Asigurări', value: 'Întreabă ce acoperă' },
      { label: 'Domeniu public', value: 'Întreabă la primărie' },
    ] }),
    node('intro', 'text', { body: para(
      'Pentru fundații, șanțuri, nivelări sau ridicări de sarcini grele, o firmă sau un proprietar închiriază de obicei utilajul împreună cu operatorul. Alegerea utilajului și pregătirea terenului contează cât alegerea firmei.',
      'Pagina te ajută să afli ce utilaj se potrivește, ce să întrebi și ce intră în ofertă. Pentru schele și popi, vezi pagina de închiriere schelă.',
    ) }),
    node('what-h', 'heading', { text: 'Utilaje frecvente', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Buldoexcavator', text: 'Utilaj versatil pentru săpături, încărcări și lucrări de amploare medie, cu acces mai larg.' },
      { title: 'Miniexcavator', text: 'Potrivit spațiilor strâmte, curților și lucrărilor mai mici sau de precizie.' },
      { title: 'Macara', text: 'Ridică și poziționează încărcături grele sau voluminoase; manevra o face personal calificat.' },
      { title: 'Alte utilaje', text: 'Încărcătoare, camioane, compactoare, în funcție de lucrare; le discuți cu firma.' },
    ] }),
    node('mat-h', 'heading', { text: 'Operator, asigurări și teren', level: 'h2' }),
    node('mat', 'text', { body: para(
      'Operatorul trebuie să fie calificat și autorizat pentru tipul de utilaj. Nu te baza pe improvizații și nu permite conducerea de către persoane necalificate. Cere firmei să te informeze despre asigurări și despre cine răspunde pentru daune.',
      'Înainte de săpături, verifică rețelele subterane și locul de depozitare a pământului. Pentru macara, pregătește accesul, spațiul de manevră și stabilitatea terenului. Dacă lucrarea afectează trotuarul, drumul sau vecinii, întreabă la primărie ce acte sunt necesare.',
    ) }),
    node('steps', 'steps', { title: 'Cum decurge închirierea', items: [
      { title: 'Descrii lucrarea', text: 'Tipul, volumul, terenul și accesul ajută firma să recomande utilajul.' },
      { title: 'Vizită și verificări', text: 'Se evaluează accesul, rețelele și riscurile.' },
      { title: 'Ofertă și contract', text: 'Cu utilajul, operatorul, durata, transportul și răspunderea scrise.' },
      { title: 'Execuție', text: 'Lucrarea se face după plan, cu zona marcată și protejată.' },
      { title: 'Încheiere', text: 'Se verifică rezultatul, se curăță zona și se închide contractul.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Utilaj nepotrivit', text: 'Prea mare nu intră sau strică terenul, prea mic nu face lucrarea.' },
      { title: 'Ignorarea rețelelor subterane', text: 'O conductă lovită poate cauza avarii și pericole.' },
      { title: 'Operator necalificat', text: 'Riscuri pentru oameni și clădiri.' },
      { title: 'Lipsa asigurărilor clare', text: 'Cine plătește daunele trebuie știut din timp.' },
      { title: 'Uitarea actelor', text: 'Ocuparea domeniului public sau ridicările cu macara pot cere aprobări.' },
      { title: 'Ofertă incompletă', text: 'Transportul, operatorul și combustibilul trebuie să fie precizate.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de tipul utilajului, de durata folosirii, de transport, de operator, de combustibil, de condițiile de lucru și de asigurări. O ofertă fără operator sau fără transport nu se compară cu una completă.',
      'Cere oferte care detaliază ce este inclus. Pentru ordin de mărime, vezi paginile de preț.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Întreabă ce calificări are operatorul, în ce stare este utilajul și ce asigurări există. Cere lucrări similare și referințe.',
      'Cere contract scris, cu durata, plata și răspunderea pentru daune, și clarifică ce se întâmplă dacă lucrarea durează mai mult sau utilajul se defectează.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre închirierea utilajelor' }),
    node('prices', 'price_links', { title: 'Prețuri pentru închirieri' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la închirieri' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de un utilaj?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
