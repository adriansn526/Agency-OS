import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const inchiriereSchela: SituationContent = {
  slug: 'inchirieri-utilaje-schele--inchiriere-schela',
  categorie: 'inchirieri-utilaje-schele',
  title: 'Închiriere schelă metalică și popi',
  seoTitle: 'Închiriere schelă metalică și popi: ce să verifici',
  seoDescription: 'Cum închiriezi o schelă metalică sau popi: cu sau fără montaj, ce siguranță contează, ce intră în ofertă, de ce depinde costul și cum compari firmele.',
  summary: 'Ce să știi când închiriezi schelă metalică sau popi: montaj, siguranță, condiții de închiriere și ce să compari în oferte.',
  sinonime: ['inchiriere schela', 'schela de inchiriat', 'inchiriat schela metalica', 'inchiriere schela metalica', 'popi metalici de inchiriat', 'inchiriere popi metalici', 'inchiriere schela pret', 'schela metalica de inchiriat', 'închiriere schelă', 'schelă de închiriat', 'închiriat schelă metalică', 'închiriere schelă metalică', 'popi metalici de închiriat', 'închiriere popi metalici', 'închiriere schelă preț', 'schelă metalică de închiriat'],
  intrebari: [
    'Ce se închiriază, de fapt? | Elemente de schelă (cadre, platforme, diagonale, scări) sau popi metalici pentru susținerea cofrajelor și planșeelor. Poți închiria doar materialul sau materialul împreună cu montajul și demontajul de către o echipă.',
    'Montez singur schela sau o montează o firmă? | Montajul corect cere experiență, iar o schelă greșit montată este periculoasă. Pentru înălțimi mari sau lucrări de durată, alege montajul de către o echipă calificată. Dacă o montezi singur, cere instrucțiunile firmei și respectă-le întocmai.',
    'Ce siguranță trebuie să aibă o schelă? | Să fie completă, nedeformată și montată conform instrucțiunilor, cu ancorări, protecții laterale și acces sigur. Verifică starea elementelor la livrare și cere ca montajul să fie preluat de o persoană competentă.',
    'Am nevoie de autorizație pentru schelă? | Dacă ocupă trotuarul sau domeniul public, probabil da; depinde de primărie și de situație. Întreabă la primărie înainte de montaj și cere firmei să te informeze ce documente sunt necesare.',
    'Pentru ce se folosesc popii metalici? | Pentru susținerea temporară a cofrajelor și a planșeelor în timpul turnării și întăririi betonului. Numărul și dispunerea lor se stabilesc prin proiect sau de un specialist, nu din obișnuință.',
    'Cum se calculează perioada și plata închirierii? | Se stabilesc în contract: durata, modul de plată, eventuala garanție, răspunderea pentru pierderi și deteriorări, transportul. Citește condițiile înainte de a semna și păstrează dovada predării și returnării.',
    'De ce depinde costul? | De cantitatea și tipul elementelor, de durata închirierii, de transport, de montaj și demontaj, de garanție și de condiții. Cere oferte care detaliază fiecare element și vezi paginile de preț.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Închiriere schelă și popi metalici: ce să verifici în ofertă', subtitle: 'Cu sau fără montaj, siguranță, contract și costuri. Dacă vrei oferte, ceri gratuit de la firme verificate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Se închiriază', value: 'Schelă sau popi metalici' },
      { label: 'Variante', value: 'Doar material sau cu montaj' },
      { label: 'Siguranță', value: 'Montaj corect, ancorări, protecții' },
      { label: 'Domeniu public', value: 'Întreabă la primărie' },
    ] }),
    node('intro', 'text', { body: para(
      'Pentru fațade, acoperișuri sau turnarea planșeelor, schela și popii se închiriază de obicei, nu se cumpără. Diferența dintre o ofertă bună și una slabă ține de starea materialului, de montaj și de condițiile din contract.',
      'Pagina te ajută să înțelegi ce se oferă, ce întrebi și ce intră în preț. Pentru lucrări la înălțime făcute de echipe pe corzi, vezi pagina de alpinism utilitar.',
    ) }),
    node('what-h', 'heading', { text: 'Ce poți închiria', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Schelă metalică', text: 'Cadre, platforme și scări pentru lucru la fațadă, acoperiș sau interior înalt.' },
      { title: 'Popi metalici', text: 'Susțineri reglabile pentru cofraje și planșee, în timpul turnării.' },
      { title: 'Montaj și demontaj', text: 'Serviciu opțional, în care echipa firmei montează și demontează structura.' },
      { title: 'Transport', text: 'Livrare și ridicare, cu sau fără încărcare, după contract.' },
    ] }),
    node('mat-h', 'heading', { text: 'Siguranță și contract', level: 'h2' }),
    node('mat', 'text', { body: para(
      'O schelă trebuie să fie completă, curată și fără elemente deformate sau ruginite, montată pe sol stabil, ancorată și prevăzută cu protecții laterale și acces sigur. Cere să vezi starea materialului la livrare și să primești instrucțiunile de montaj.',
      'În contract trebuie să apară ce se închiriază, durata, plata, garanția, răspunderea pentru pierderi și deteriorări, transportul și cine montează. Dacă schela ocupă trotuarul sau drumul, întreabă la primărie ce acte sunt necesare.',
    ) }),
    node('steps', 'steps', { title: 'Cum decurge închirierea', items: [
      { title: 'Stabilești lucrarea', text: 'Înălțimea, suprafața, durata și accesul determină cantitatea necesară.' },
      { title: 'Ceri oferte', text: 'Compară pe aceleași criterii: material, montaj, transport, garanție.' },
      { title: 'Contract', text: 'Cu liste de elemente, durată, răspundere și plată.' },
      { title: 'Livrare și montaj', text: 'Verifici starea materialului și, dacă firma montează, urmărești lucrarea.' },
      { title: 'Folosire și returnare', text: 'Respecți condițiile de utilizare și returnezi complet, conform contractului.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Montaj improvizat', text: 'O schelă greșit montată poate ceda, cu urmări grave.' },
      { title: 'Material neverificat', text: 'Elemente deformate sau lipsă compromit siguranța.' },
      { title: 'Ignorarea terenului', text: 'Sol moale sau în pantă cere calale și ancorare adecvate.' },
      { title: 'Contract neclar', text: 'Răspunderea pentru pierderi și deteriorări trebuie scrisă.' },
      { title: 'Uitarea actelor de ocupare', text: 'Pe domeniul public, întreabă din timp la primărie.' },
      { title: 'Ofertă care nu se poate compara', text: 'Cere liste de elemente, nu doar un preț total.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de cantitate și tip, de durata închirierii, de transport, de montaj și demontaj, de garanție și de condiții. O ofertă fără montaj pare mai ieftină, dar nu este comparabilă cu una care îl include.',
      'Cere oferte care separă închirierea de transport și de montaj. Pentru ordin de mărime, vezi paginile de preț.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Întreabă dacă echipa de montaj este calificată pentru lucru la înălțime, în ce stare este materialul și ce asigurări există. Cere un contract clar și o listă a elementelor predate.',
      'Alege firma care îți explică limitele schelei și condițiile de folosire, nu doar prețul.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre închirierea schelei' }),
    node('prices', 'price_links', { title: 'Prețuri pentru închirieri' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la închirieri' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de schelă sau popi?', text: 'Descrie lucrarea și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
