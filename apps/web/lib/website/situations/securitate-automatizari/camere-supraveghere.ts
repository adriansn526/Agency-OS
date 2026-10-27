import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const camereSupraveghere: SituationContent = {
  slug: 'securitate-automatizari--camere-supraveghere',
  categorie: 'securitate-automatizari',
  title: 'Camere de supraveghere: montaj și sisteme video',
  seoTitle: 'Camere de supraveghere: montaj și sisteme video',
  seoDescription: 'Cum alegi și montezi un sistem de camere de supraveghere: soluții, ordinea lucrării, GDPR și vecini, de ce depinde costul și cum compari ofertele instalatorilor.',
  summary: 'Ce presupune un sistem de camere de supraveghere pentru casă sau apartament, ce reguli privesc viața privată și ce să compari în ofertele de montaj.',
  sinonime: ['camere supraveghere', 'camere de supraveghere', 'camere supraveghere exterior', 'camera supraveghere exterior', 'camere de supraveghere exterior', 'video supraveghere', 'supraveghere video', 'montaj camere supraveghere', 'supraveghere', 'camera supraveghere interior', 'cameră supraveghere interior', 'cameră supraveghere exterior', 'montaj camere supraveghere'],
  intrebari: [
    'Ce conține un sistem de camere de supraveghere? | Camerele, un aparat sau serviciu care înregistrează imaginile, alimentarea și cablarea (sau rețeaua wireless) și o aplicație sau un monitor pentru vizionare. Un instalator stabilește împreună cu tine unde se pun camerele și cum se leagă.',
    'Pot filma strada sau curtea vecinului? | Depinde. Camera îndreptată spre spații care nu sunt ale tale ridică probleme de viață privată și de prelucrare a datelor. Verifică regulile privind datele personale și discută cu vecinii înainte de montaj. Nu te baza pe ce s-a făcut „la alții”.',
    'Am nevoie de acordul vecinilor sau al asociației? | Pe spații comune dintr-un bloc sau dintr-un ansamblu, de regulă da: acordul asociației sau al administratorului. Chiar și în case, o cameră care vede în curtea vecinului se discută cu acesta. Întreabă la asociație sau la un specialist în protecția datelor.',
    'Ce rol are GDPR? | Imaginile cu persoane sunt date personale. Dacă filmezi, trebuie să ai un motiv clar, să informezi persoanele (de exemplu cu un panou), să păstrezi imaginile în siguranță și să nu le folosești în alte scopuri. Pentru reguli detaliate, vezi autoritatea de protecție a datelor sau un jurist.',
    'Cine montează camerele? | O firmă de instalare sistem video. Dacă lucrarea implică modificări în instalația electrică, tabloul sau cabluri în pereți, partea electrică o face un electrician autorizat. Pentru lucrul la înălțime sau pe fațadă, firma trebuie să aibă echipamentul necesar.',
    'Wireless sau cu cablu? | Cablul este de regulă mai stabil și mai greu de perturbat, dar cere traseu prin pereți. Wireless-ul se montează mai ușor, dar depinde de rețea și de alimentare. Soluția se alege după clădire și după ce vrei să acoperi.',
    'Cât timp se păstrează înregistrările? | Depinde de spațiul de stocare și de regulile privind datele personale. Întreabă instalatorul ce setări se pot face și verifică cerințele aplicabile. Nu păstra imagini mai mult decât ai nevoie.',
    'De ce depinde costul? | De numărul și tipul camerelor, de înregistrare și stocare, de lungimea cablurilor, de accesul la locurile de montaj și de dacă sunt necesare lucrări electrice. Cere ofertă detaliată.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Camere de supraveghere: cum alegi un sistem și cine îl montează', subtitle: 'Soluții pentru casă sau apartament, reguli privind viața privată și ce întrebi la ofertă. Dacă vrei ca montajul să-l facă o firmă, ceri oferte gratuite.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Componente', value: 'Camere, înregistrare, alimentare, vizionare' },
      { label: 'Reguli', value: 'Date personale și acordul vecinilor' },
      { label: 'Electric', value: 'Electrician acolo unde se atinge rețeaua' },
      { label: 'Oferta', value: 'Echipament separat de manoperă' },
    ] }),
    node('intro', 'text', { body: para(
      'Sistemul de supraveghere video este una dintre cele mai căutate lucrări de securitate. Nu alegi doar camere, ci un ansamblu: unde privesc, cum se înregistrează imaginea, cum se alimentează și cine are acces la ea. Iar în spate stă o întrebare care contează la fel de mult: ce voie ai să filmezi.',
      'Pagina te ajută să înțelegi soluțiile, ordinea lucrării și regulile de bun-simț, fără să recomande mărci. Pentru alarme și automatizări, vezi situația dedicată; pentru acces în bloc, situația despre interfon.',
    ) }),
    node('what-h', 'heading', { text: 'Ce soluții există', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Camere pentru exterior', text: 'Rezistă la ploaie, praf și variații de temperatură. Se așază spre intrare, curte sau parcare, pe proprietatea ta.' },
      { title: 'Camere pentru interior', text: 'Se folosesc cu discreție, cu informarea persoanelor din casă. Camerele din spații private ridică întrebări aparte.' },
      { title: 'Sistem cu cablu', text: 'Camerele se leagă la aparatul de înregistrare printr-un traseu de cablu. Stabilitate bună, dar cere lucrări de cablare.' },
      { title: 'Sistem fără fir', text: 'Mai ușor de montat, dar depinde de rețea și de alimentare; se alege cu grijă la clădiri cu pereți groși.' },
    ] }),
    node('law-h', 'heading', { text: 'Viața privată, GDPR și vecinii', level: 'h2' }),
    node('law', 'text', { body: para(
      'Imaginile cu persoane sunt date personale. Camera orientată spre proprietatea ta, într-un scop clar, ridică mai puține probleme decât una care vede în curtea vecinului sau pe stradă. Informarea persoanelor, păstrarea în siguranță a imaginilor și accesul limitat la ele fac parte din bunele practici.',
      'Într-un bloc sau un ansamblu, spațiile comune (scară, hol, parcare comună) nu sunt ale unui singur proprietar: ai nevoie de acordul asociației. Regulile exacte depind de situație; verifică la asociație, la autoritatea de protecție a datelor sau la un jurist, nu la un anunț de pe internet.',
    ) }),
    node('where-h', 'heading', { text: 'Cine montează și ce implică lucrarea', level: 'h2' }),
    node('where', 'text', { body: para(
      'Montajul îl face o firmă de sisteme de securitate. Dacă trebuie tras un circuit nou, modificat tabloul sau lucrat în instalația electrică, partea electrică revine unui electrician autorizat. Lucrul pe fațadă sau pe scară cere echipament pentru lucru la înălțime, deci firma trebuie să-l aibă.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Scopul și zonele', text: 'Stabilești ce vrei să protejezi: intrare, curte, garaj. De aici rezultă numărul de camere.' },
      { title: 'Acorduri și informare', text: 'Verifici regulile, discuți cu vecinii sau cu asociația și pregătești informarea persoanelor.' },
      { title: 'Proiectul sistemului', text: 'Firma propune locurile camerelor, traseele și locul înregistrării.' },
      { title: 'Montaj și cablare', text: 'Se fixează camerele, se trag cablurile, se leagă alimentarea, de electrician acolo unde se cere.' },
      { title: 'Configurare și instruire', text: 'Se reglează unghiurile, accesul și înregistrarea, iar tu înveți să folosești sistemul.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Cameră îndreptată spre vecin', text: 'Cea mai frecventă sursă de conflicte; poziția se discută și se reglează.' },
      { title: 'Lipsa informării', text: 'Persoanele filmate trebuie să știe; un panou de informare se pune la vedere.' },
      { title: 'Parole slabe', text: 'Un sistem accesibil de pe internet cu parola implicită poate fi văzut de oricine.' },
      { title: 'Alimentare improvizată', text: 'Prelungitoare și conexiuni făcute pe genunchi sunt un risc electric.' },
      { title: 'Unghi sau lumină nepotrivite', text: 'Camera care privește în soare sau fără iluminare nu îți dă imagine utilă.' },
      { title: 'Cumpărarea fără plan', text: 'Camere luate separat, fără sistem, ajung greu de legat și de administrat.' },
    ] }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul depinde de numărul și tipul camerelor, de modul de înregistrare și stocare, de lungimea cablurilor, de accesul la locurile de montaj și de eventualele lucrări electrice. Un sistem pentru un apartament și unul pentru o curte mare sunt lucrări foarte diferite.',
      'Cere ofertă care separă echipamentul de manoperă și spune ce setări de securitate se fac. Pentru ordin de mărime, vezi paginile de preț de mai jos.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Compară ce primești concret: câte camere, ce tip de înregistrare, cine configurează accesul, ce garanție și ce service. Întreabă cine răspunde dacă sistemul se defectează și dacă ai acces la configurație, nu doar la aplicație.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Alege o firmă care vine la fața locului, explică de ce propune anumite poziții și te avertizează dacă o cameră ridică probleme de viață privată. Cere lucrări similare și informații despre securitatea accesului.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre camerele de supraveghere' }),
    node('prices', 'price_links', { title: 'Prețuri pentru securitate și automatizări' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la securitate și automatizări' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca sistemul video să-l monteze o firmă?', text: 'Descrie locuința și zonele de acoperit și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
