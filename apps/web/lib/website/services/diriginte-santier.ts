import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "diriginte de șantier": it presents the situation and sends to the guides and price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const diriginteSantier: ServiceContent = {
  slug: 'diriginte-santier',
  hub: true,
  seoTitle: 'Diriginte de șantier: rol, autorizare și firme',
  seoDescription: 'Diriginte de șantier: ce face, cum verifici autorizarea ISC, ce urmărește pe etape și cum compari ofertele. Ghiduri, prețuri și specialiști verificați.',
  summary: 'Ce face dirigintele de șantier, cum verifici că este autorizat și ce să ceri în ofertă și în contract.',
  preturi: [],
  intrebari: [
    'Ce este dirigintele de șantier? | Specialistul care reprezintă beneficiarul pe șantier și verifică dacă lucrarea se execută conform proiectului, autorizației și regulilor aplicabile.',
    'Cine poate fi diriginte? | Persoana autorizată pentru acest rol de Inspectoratul de Stat în Construcții (ISC), în domeniul lucrării. Verifică autorizarea în evidența publică a instituției.',
    'Când am nevoie de diriginte? | În general la lucrările cu autorizație de construire; regulile diferă după tipul lucrării. Întreabă la primărie sau la ISC dacă proiectul tău îl cere.',
    'Cine îl plătește și cine îl alege? | Beneficiarul. Dirigintele trebuie să fie independent de constructor, altfel nu mai poate controla obiectiv execuția.',
    'Care e diferența față de responsabilul tehnic cu execuția? | Responsabilul tehnic lucrează în echipa constructorului, dirigintele este de partea beneficiarului. Sunt roluri diferite, cu atribuții diferite.',
    'De ce depinde costul? | De mărimea și complexitatea lucrării, de durata execuției, de numărul vizitelor și de distanță. Compară oferte scrise care spun ce vizite sunt incluse; paginile de preț dau repere.',
    'Ce să cuprindă contractul cu dirigintele? | Lucrarea, domeniul de autorizare, atribuțiile, frecvența vizitelor, participarea la lucrările ascunse și la recepție, modul de comunicare a observațiilor.',
  ],
  sinonime: ['diriginte autorizat', 'dirigintele de șantier', 'supervizor lucrare', 'control execuție', 'urmărire lucrare', 'diriginte lucrare'],
  blocks: [
    node('hero', 'hero', { title: 'Diriginte de șantier', subtitle: 'Cine este, ce face și cum verifici autorizarea. Descrie lucrarea și primești oferte de la specialiști verificați, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Rol', value: 'Controlul execuției pentru beneficiar' },
      { label: 'Autorizare', value: 'ISC, pe domenii' },
      { label: 'Independență', value: 'Nu este firma care execută' },
      { label: 'Contract', value: 'Vizite și atribuții scrise' },
    ] }),
    node('intro', 'text', { body: para(
      'Dirigintele de șantier este ochiul beneficiarului pe lucrare: verifică în numele lui ce face constructorul și semnalează problemele la timp, când se mai pot repara ieftin. Contează să fie autorizat, independent și prezent pe șantier la momentele importante.',
      'Pagina te ajută să înțelegi rolul lui și să cauți un specialist. Detaliile obligațiilor depind de lucrare, deci întreabă la primărie sau la ISC ce se aplică proiectului tău.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Diriginte de șantier autorizat', text: 'Rolul pe șantier, cum verifici autorizarea ISC și ce să ceri în contract și în ofertă.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Diriginte de șantier pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre construcții' }),
    node('prices', 'price_links', { title: 'Prețuri pentru diriginte de șantier' }),
    node('steps', 'steps', { title: 'Cum decurge colaborarea', items: [
      { title: 'Verifici autorizarea', text: 'Cere legitimația și caută persoana în evidența ISC, cu domeniul potrivit lucrării.' },
      { title: 'Ofertă și contract', text: 'Atribuții, frecvența vizitelor, lucrările ascunse la care participă, recepția.' },
      { title: 'Urmărirea pe etape', text: 'Dirigintele vizitează șantierul, verifică execuția și consemnează constatările.' },
      { title: 'Remedieri', text: 'Observațiile scrise ajung la constructor, care le corectează înainte de a continua.' },
      { title: 'Recepție', text: 'Participă la recepția lucrării, alături de beneficiar și constructor.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi dirigintele', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Verifică autorizarea și domeniul, cere lucrări asemănătoare și alege-l tu, nu constructorul. Compară cel puțin două oferte pe aceleași criterii: vizite incluse, atribuții și disponibilitate la lucrările ascunse.',
      'Pe IntraConstruct vezi specialiștii verificați și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre dirigintele de șantier' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de un diriginte de șantier?', text: 'Descrie lucrarea și primești oferte de la specialiști verificați din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
