import { node, para, type ServiceContent } from './types'

/**
 * Pillar page of the hub "zugrăveli și vopsitorie": it presents the situations and sends to the price pages (blocks that fill themselves with what is
 * published). It has no price table of its own: prices live in the dedicated price pages.
 */
export const zugraveliVopsitorie: ServiceContent = {
  slug: 'zugraveli-vopsitorie',
  hub: true,
  seoTitle: 'Zugrăveli și vopsitorie: situații, soluții și firme',
  seoDescription: 'Zugrăveli și vopsitorie pentru apartamente și case: zugrăvit interior, glet, finisaje decorative. Cum alegi, cum compari ofertele și firme verificate.',
  summary: 'Zugrăvit interior, glet și finisaje decorative: ce lucrări include categoria, cum le alegi și cum compari ofertele firmelor.',
  preturi: [],
  intrebari: [
    'Ce intră la zugrăveli și vopsitorie? | Pregătirea pereților și a tavanelor, gletul, grunduirea, vopsirea și finisajele decorative. Lucrările se fac în ordine, iar rezultatul final depinde mult de pregătirea suportului.',
    'Cum aleg între zugrăvit simplu, glet și finisaj decorativ? | Pornește de la starea pereților și de la aspectul dorit. Pe pereți în stare bună poate ajunge un zugrăvit simplu; pe pereți denivelați sau când vrei o suprafață fină se justifică gletul; pentru textură sau efecte se aleg finisajele decorative.',
    'Ce ar trebui să conțină o ofertă? | Suprafața măsurată, etapele incluse (pregătire, grund, glet, straturi de vopsea), produsele folosite, cine cumpără materialele, termenul, garanția pentru manoperă și condițiile de plată.',
    'Cum compar ofertele? | Pe același conținut: aceleași suprafețe, același număr de straturi și aceeași pregătire. O ofertă mult mai mică omite, de obicei, un pas, de pildă gletul sau grunduirea.',
    'Cât durează o lucrare de zugrăveală? | Durata depinde de suprafață, de pregătire, de numărul de straturi și de timpii de uscare ai produselor. Firma îți poate da un termen realist după o vizită.',
    'Pot face lucrarea singur? | La suprafețe mici și pereți în stare bună, da. Gletul, finisajele decorative și lucrările la înălțime cer practică, iar rezultatul se vede imediat în lumină rasantă.',
  ],
  sinonime: ['zugrăveli', 'zugravi', 'zugrav', 'vopsitorie', 'vopsitor', 'zugrăvit', 'finisaje pereți'],
  blocks: [
    node('hero', 'hero', { title: 'Zugrăveli și vopsitorie', subtitle: 'Zugrăvit interior, glet și finisaje decorative: ce lucrări există și cum compari ofertele. Descrie lucrarea și primești oferte de la firme verificate, fără obligații.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Primul pas', value: 'Starea pereților' },
      { label: 'Ce alegi', value: 'Zugrăvit, glet sau decorativ' },
      { label: 'Compari', value: 'Straturi, produs, pregătire' },
      { label: 'Garanție', value: 'Cere-o în scris' },
    ] }),
    node('intro', 'text', { body: para(
      'Zugrăveala este ultimul pas al unei renovări, dar rezultatul se decide mult mai devreme, la pregătirea pereților. Un perete bine pregătit și bine vopsit arată curat ani de zile; unul grăbit arată pete, urme și fisuri.',
      'Pagina te ajută să identifici lucrarea de care ai nevoie și te trimite la pagina potrivită. La final poți cere oferte gratuite de la firme verificate din zona ta.',
    ) }),
    node('situations-h', 'heading', { text: 'Situațiile cele mai frecvente', level: 'h2' }),
    node('situations', 'cards', { columns: '3', items: [
      { title: 'Zugrăvit interior', text: 'Pregătirea pereților, grunduirea și vopsirea cu lavabilă; ce include oferta și de ce depinde costul.' },
      { title: 'Glet și gletuire', text: 'Glet de încărcare și de finisaj, aplicare manuală sau cu pompa, pentru pereți netezi înainte de vopsit.' },
      { title: 'Tencuială și vopsea decorativă', text: 'Finisaje cu textură sau efect, pentru interior și fațadă; cum alegi și ce întrebi aplicatorul.' },
    ] }),
    node('situation-links', 'situation_links', { title: 'Zugrăveli și vopsitorie pe situații' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('prices', 'price_links', { title: 'Prețuri pentru zugrăveli și vopsitorie' }),
    node('steps', 'steps', { title: 'Cum decurge lucrarea cu o firmă', items: [
      { title: 'Vizită și măsurători', text: 'Firma vede pereții, stabilește ce pregătire cer și măsoară suprafețele. Oferta trebuie să pornească de aici.' },
      { title: 'Ofertă detaliată', text: 'Cere etapele, produsele, numărul de straturi, termenul și garanția. Compară oferte cu același conținut.' },
      { title: 'Contract și avans', text: 'Contract scris, cu suprafețe, produse și termen. Evită plata integrală în avans.' },
      { title: 'Execuție', text: 'Protejare, pregătire, glet dacă este cazul, grund și vopsire, cu respectarea timpilor de uscare.' },
      { title: 'Recepție', text: 'Verifică pereții în lumină rasantă, cere retușurile și primește garanția scrisă.' },
    ] }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere cel puțin două sau trei oferte și compară-le pe aceleași criterii: pregătirea, straturile, produsul, termenul și garanția. O ofertă mult mai mică lasă de obicei deoparte un pas important.',
      'Întreabă ce lucrări similare a făcut firma și cere, dacă se poate, referințe. Pe IntraConstruct vezi firmele verificate și recenziile clienților.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre zugrăveli și vopsitorie' }),
    node('firms', 'firms_list', { title: 'Firme de zugrăveli și vopsitorie', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei oferte de la firme verificate?', text: 'Descrie lucrarea și primești oferte de la firme din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
