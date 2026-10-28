import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "proiectare și arhitectură": it presents the situations and sends to the guides and price pages (blocks that fill themselves with
 * what is published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const proiectareArhitectura: ServiceContent = {
  slug: 'proiectare-arhitectura',
  hub: true,
  seoTitle: 'Proiectare și arhitectură: situații și specialiști',
  seoDescription: 'Proiectare și arhitectură pentru casă sau amenajare interioară: ce conține un proiect, cine îl semnează, ce primești și cum compari ofertele proiectanților.',
  summary: 'Proiect de casă și design interior: ce conține proiectul, cine îl semnează, ce primești de la un specialist și cum compari ofertele.',
  preturi: [],
  intrebari: [
    'Ce face un arhitect sau un proiectant? | Transformă nevoile tale și regulile terenului într-un proiect: planuri, fațade, structură și instalații, plus documentația pentru autorizare. Documentația care se depune la primărie trebuie semnată de persoane care au dreptul legal să o facă.',
    'Care este diferența dintre arhitectură și design interior? | Arhitectura privește clădirea: volum, structură, fațade și relația cu terenul. Designul interior privește interiorul: aranjarea încăperilor, finisajele, lumina și mobilierul. La modificări de structură e nevoie de proiectant autorizat.',
    'Ce primesc de la un specialist? | Depinde de contract: schițe și variante, planuri, proiect tehnic, dosar pentru autorizare, randări, liste de materiale. Cere livrabilele pe etape, în scris, înainte de începerea lucrului.',
    'Pot folosi un proiect gata făcut? | Da, dar el trebuie adaptat terenului și regulilor zonei, iar modelele au drepturi de autor. Cere acordul autorului și întreabă ce adaptări sunt incluse în preț.',
    'Ce acte trebuie să lămuresc înainte de proiect? | De obicei actele terenului și un certificat de urbanism, care arată ce se poate construi. Detaliile depind de localitate, de aceea întreabă la primărie ce documente se cer.',
    'De ce depinde costul serviciilor de proiectare? | De suprafață și complexitate, de cât de personalizat e proiectul, de părțile incluse (arhitectură, structură, instalații, randări), de studiile de teren și de serviciile de după proiect. Paginile de prețuri explică factorii.',
    'Cum aleg un specialist? | Alege unul care are dreptul să semneze documentația, îți explică etapele și răspunde clar la întrebările despre acte. Cere contract scris cu etape, livrabile și drepturi asupra proiectului, și vezi lucrări anterioare.',
  ],
  sinonime: ['arhitect', 'proiectant', 'arhitectură', 'proiectare', 'servicii de proiectare', 'birou de arhitectură'],
  blocks: [
    node('hero', 'hero', { title: 'Proiectare și arhitectură', subtitle: 'Proiect de casă sau design interior: ce primești, cine semnează și cum compari ofertele. Descrie ce ai nevoie și primești oferte de la specialiști verificați.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Cine semnează', value: 'Specialist cu drept de semnătură' },
      { label: 'Primul pas', value: 'Teren și certificat de urbanism' },
      { label: 'Compari', value: 'Livrabilele din fiecare etapă' },
      { label: 'Atenție', value: 'Drepturile de autor ale proiectului' },
    ] }),
    node('intro', 'text', { body: para(
      'Proiectul stă la baza oricărei construcții sau amenajări: de el depind autorizația, execuția și, în mare parte, costul final. Un proiect bun ține cont de teren, de regulile zonei, de felul în care locuiești și de buget.',
      'Pagina te ajută să alegi între proiectul unei case și designul interior și te trimite la pagina potrivită. La final poți cere oferte gratuite de la specialiști verificați din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '2', items: [
      { title: 'Proiect de casă', text: 'Parter, mansardă sau etaj, proiect-tip sau personalizat: ce conține proiectul, cine îl semnează și ce primești.' },
      { title: 'Design interior', text: 'Planuri de amenajare, randări și liste de materiale: ce livrează un designer și cum decurge colaborarea.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Proiectare și arhitectură pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri despre proiectare' }),
    node('prices', 'price_links', { title: 'Prețuri pentru proiectare și amenajări' }),
    node('steps', 'steps', { title: 'Cum decurge colaborarea cu un specialist', items: [
      { title: 'Temă și teren', text: 'Descrii nevoile și bugetul, iar terenul și regulile zonei se lămuresc cu primăria.' },
      { title: 'Ofertă pe etape', text: 'Cere livrabilele numite pentru fiecare etapă: schițe, proiect tehnic, dosar, randări.' },
      { title: 'Contract', text: 'Cu etape, livrabile, termene, plăți legate de ele și drepturile asupra proiectului.' },
      { title: 'Concept și variante', text: 'Alegi o direcție și o rafinezi împreună cu specialistul.' },
      { title: 'Proiect detaliat', text: 'Se întocmesc planurile, structura, instalațiile și, după caz, dosarul de autorizare.' },
      { title: 'Asistență la execuție', text: 'Stabilește dacă specialistul urmărește lucrarea și cum se tratează modificările.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi specialistul', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Compară ofertele pe aceleași rubrici: ce părți ale proiectului sunt incluse, câte variante, ce asistență primești și cine semnează. O ofertă mai mică poate exclude structura, instalațiile sau randările.',
      'Cere lucrări anterioare asemănătoare cu a ta și un contract scris. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre proiectare și arhitectură' }),
    node('firms', 'firms_list', { title: 'Specialiști în proiectare și arhitectură', limit: '6' }),
    node('cta', 'request_cta', { title: 'Cauți un specialist pentru proiectul tău?', text: 'Descrie ce ai nevoie și primești oferte de la specialiști verificați din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
