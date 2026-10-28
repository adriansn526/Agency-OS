import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "audit și certificat energetic": presents the situations and sends to guides and price pages. No price table of its own.
 */
export const auditCertificatEnergetic: ServiceContent = {
  slug: 'audit-certificat-energetic',
  hub: true,
  seoTitle: 'Audit și certificat energetic: auditori și ghiduri',
  seoDescription: 'Certificat energetic și audit energetic pentru locuințe și clădiri: ce sunt, când se cer, cine le face și cum compari ofertele. Ghiduri, prețuri și specialiști.',
  summary: 'Certificat energetic și audit energetic: ce sunt, cine le întocmește, ce pregătești și cum compari ofertele auditorilor.',
  preturi: [],
  intrebari: [
    'Ce este certificatul energetic? | Un document care încadrează energetic o clădire sau o locuință, întocmit de un auditor atestat.',
    'Când se cere? | În situații prevăzute de reglementări, de exemplu vânzare, închiriere sau finanțări. Întreabă notarul, agentul sau finanțatorul.',
    'Care e diferența față de auditul energetic? | Certificatul descrie și încadrează; auditul analizează mai amplu și propune măsuri de îmbunătățire.',
    'Cât costă? | Depinde de tipul și dimensiunea clădirii, de instalații și de documentele disponibile. Paginile de preț explică factorii.',
    'Ce pregătesc pentru auditor? | Actele clădirii, planuri, informații despre izolații și instalații și accesul în clădire. Lista exactă o dă auditorul.',
    'Pot îmbunătăți performanța energetică? | Da, prin izolare, geamuri, încălzire sau ventilație. Auditorul poate spune ce măsuri au efect.',
  ],
  sinonime: ['eficiență energetică', 'performanță energetică clădire', 'clasa energetică', 'atestat energetic clădiri', 'auditori clădiri'],
  blocks: [
    node('hero', 'hero', { title: 'Audit și certificat energetic', subtitle: 'Certificat sau audit energetic pentru o locuință sau o clădire: ce sunt, cine le face și cum compari ofertele. Poți cere oferte gratuite de la specialiști.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine le face', value: 'Auditor energetic atestat' },
      { label: 'Când se cer', value: 'Depinde de situație' },
      { label: 'Datele', value: 'Le pregătești pentru auditor' },
      { label: 'Oferta', value: 'Ce include, ce date cere' },
    ] }),
    node('intro', 'text', { body: para(
      'Documentele energetice arată cât de eficientă energetic este o clădire și ce poate fi îmbunătățit. Se cer în anumite situații (vânzare, închiriere, finanțări) și ajută la decizii de renovare.',
      'Pagina te ajută să înțelegi diferența dintre certificat și audit și te trimite la pagina potrivită. Obligațiile, documentele și termenele se schimbă: pentru ele, întreabă auditorul sau instituția care le cere.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Certificat energetic', text: 'Încadrarea energetică a unei clădiri sau locuințe, întocmită de un auditor atestat, cu recomandări.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Audit și certificat pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre eficiență energetică' }),
    node('prices', 'price_links', { title: 'Prețuri pentru audit și certificare' }),
    node('steps', 'steps', { title: 'Cum decurge, pe scurt', items: [
      { title: 'Clarifici scopul', text: 'Vânzare, închiriere, finanțare sau proiect; scopul decide documentul cerut.' },
      { title: 'Alegi auditorul', text: 'Verifici atestarea și ceri ofertă scrisă.' },
      { title: 'Pregătești datele', text: 'Actele, planurile și informațiile despre instalații și izolații.' },
      { title: 'Vizita și calculul', text: 'Auditorul verifică clădirea și calculează performanța.' },
      { title: 'Predare și folosire', text: 'Verifici datele din document și îl folosești conform scopului.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma sau specialistul', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere dovada atestării pentru tipul de clădire și o ofertă scrisă care spune ce document primești, ce date îți cere și ce include. Compară ofertele pe același conținut.',
      'Evită promisiunile de rezultat garantat: clasa vine din calcul. Pe IntraConstruct vezi firmele verificate și recenziile.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente: audit și certificat energetic' }),
    node('firms', 'firms_list', { title: 'Auditori energetici', limit: '6' }),
    node('cta', 'request_cta', { title: 'Ai nevoie de un auditor energetic?', text: 'Descrie clădirea și scopul și primești oferte de la auditori din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
