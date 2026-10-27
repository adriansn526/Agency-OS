import type { SituationContent } from '../index'
import { node, para } from '../../services/types'

export const detectorGaze: SituationContent = {
  slug: 'instalatii-gaze--detector-gaze',
  categorie: 'instalatii-gaze',
  title: 'Detector și senzor de gaze: montaj',
  seoTitle: 'Detector și senzor de gaze: montaj și alegere',
  seoDescription: 'Ce face un detector de gaze, unde se montează, ce înseamnă electrovalva, cine face montajul, de ce depinde costul și cum compari ofertele firmelor autorizate.',
  summary: 'Ce face un detector de gaze, unde se așază, ce rol are electrovalva și de ce montajul se face de o firmă autorizată, nu pe cont propriu.',
  sinonime: ['detectoare de gaze', 'detector gaze', 'senzor gaze', 'senzori de gaze', 'detector gaze cu electrovalva', 'montaj detector gaze', 'cost montare detector gaze', 'detector gaze apartament', 'detector gaze cu electrovalvă', 'costul montării detector gaze'],
  intrebari: [
    'Ce face un detector de gaze? | Măsoară prezența gazului în aer și avertizează sonor sau luminos când depășește un prag. Nu previne o scurgere și nu înlocuiește revizia instalației: te alertează dacă una a apărut.',
    'Ce este electrovalva și ce legătură are cu detectorul? | Electrovalva este un robinet comandat electric. Montată pe conducta de gaz și legată la detector, poate închide alimentarea automat când se detectează gaz. Se instalează doar de personal autorizat, pentru că intervine în instalația de gaze.',
    'Pot monta singur un detector de gaze? | Un model simplu, cu priză, poate părea ușor de pus. Dar poziționarea corectă, legarea la electrovalvă și orice lucrare pe conducta de gaz se fac de firmă autorizată ANRE. Partea electrică se face de electrician, după caz.',
    'Unde se montează detectorul? | Locul depinde de tipul de gaz și de instrucțiunile producătorului: unele gaze sunt mai ușoare decât aerul, altele mai grele. De aceea poziția nu se alege după ochi, ci după fișa aparatului și după recomandarea instalatorului.',
    'Un detector înlocuiește revizia instalației? | Nu. Detectorul semnalează o situație de pericol, dar nu controlează instalația. Revizia și verificarea rămân lucrări distincte ale unei firme autorizate, pe care le găsești descrise în pagina dedicată.',
    'Ce fac dacă detectorul sună? | Ieși din încăpere, aerisește, nu aprinde nimic și nu folosi întrerupătoare. Sună de afară la urgențe sau la distribuitor. Nu încerca să cauți scurgerea singur.',
    'Cât de des trebuie verificat detectorul? | Senzorii se uzează și au o durată de viață și un mod de testare stabilite de producător. Urmează instrucțiunile aparatului și întreabă instalatorul ce verificări sunt recomandate.',
    'De ce depinde costul montajului? | De tipul aparatului, de existența electrovalvei, de lungimea traseului și de accesul la conductă și la alimentarea electrică. Cere ofertă scrisă și compară conținutul ei.',
  ],
  blocks: [
    node('hero', 'hero', { title: 'Detector de gaze: ce face și cine îl montează', subtitle: 'Alegerea, poziția și legarea la electrovalvă țin de siguranță. Vezi ce întrebi și cum compari ofertele firmelor autorizate.', buttonLabel: 'Cere oferte gratuite', checks: ['Gratuit', 'Fără obligații'], bg: 'dark' }),
    node('facts', 'facts', { items: [
      { label: 'Rol', value: 'Alertează la prezența gazului' },
      { label: 'Cu electrovalvă', value: 'Poate opri alimentarea automat' },
      { label: 'Montaj', value: 'Instalator autorizat, plus electrician după caz' },
      { label: 'Nu înlocuiește', value: 'Revizia instalației' },
    ] }),
    node('intro', 'text', { body: para(
      'Un detector de gaze este un aparat care sesizează gazul din aer și dă alarmă. Poate fi un model simplu, care doar sună, sau unul legat la o electrovalvă care închide alimentarea cu gaz. Interesul pentru el crește mai ales în apartamente și în case cu centrală pe gaz.',
      'Pagina explică ce poți aștepta de la un detector, unde se pune, ce rol are electrovalva și de ce montajul nu este o lucrare de făcut singur. Nu numim modele sau mărci: contează cine montează și cum.',
    ) }),
    node('what-h', 'heading', { text: 'Ce soluții există', level: 'h2' }),
    node('what', 'cards', { columns: '2', items: [
      { title: 'Detector cu alarmă', text: 'Avertizează sonor și, uneori, luminos. Te alertează, dar închiderea gazului rămâne în sarcina ta.' },
      { title: 'Detector cu electrovalvă', text: 'La alarmă, valva se închide și oprește alimentarea. Montajul intervine în instalația de gaze, deci cere personal autorizat.' },
      { title: 'Detector cu legare la sistem', text: 'Unele aparate pot trimite o notificare sau se leagă la un sistem de alarmă. Merită discutat cu firma care montează.' },
      { title: 'Senzor în alte spații', text: 'Pentru centrală în încăpere separată sau pentru mai multe puncte de consum, se pot folosi mai multe puncte de detecție.' },
    ] }),
    node('where-h', 'heading', { text: 'Unde și de către cine se montează', level: 'h2' }),
    node('where', 'text', { body: para(
      'Poziția detectorului depinde de tipul de gaz folosit și de instrucțiunile producătorului, pentru că gazele se comportă diferit în aer. De aceea nu se lipește pe perete „unde pare potrivit”. Instalatorul stabilește locul după aparat și după încăpere.',
      'Dacă aparatul se leagă la o electrovalvă sau la rețeaua electrică a locuinței, lucrarea implică o parte de gaz, făcută de firmă autorizată ANRE, și o parte electrică, făcută de electrician. În bloc, orice lucrare la conducta comună se discută cu asociația și cu distribuitorul.',
    ) }),
    node('steps-h', 'steps', { title: 'În ce ordine se lucrează', items: [
      { title: 'Alegerea tipului', text: 'Decizi împreună cu firma dacă ajunge un detector cu alarmă sau ai nevoie de electrovalvă.' },
      { title: 'Verificarea instalației', text: 'Firma vede conducta, aparatele și alimentarea electrică și spune dacă montajul se poate face.' },
      { title: 'Montajul', text: 'Detectorul se fixează și, dacă e cazul, electrovalva se montează pe conductă, de personal autorizat.' },
      { title: 'Conexiuni electrice', text: 'Alimentarea și legăturile se fac conform fișei aparatului, de un electrician când lucrarea o cere.' },
      { title: 'Test și instrucțiuni', text: 'Funcționarea se testează după procedura aparatului, iar tu primești instrucțiunile și documentele.' },
    ] }),
    node('mist-h', 'heading', { text: 'Greșeli frecvente', level: 'h2' }),
    node('mist', 'cards', { columns: '2', items: [
      { title: 'Montaj pe cont propriu', text: 'O electrovalvă prinsă fără personal autorizat poate crea o scurgere chiar în locul montajului.' },
      { title: 'Poziție aleasă din ochi', text: 'Un detector pus în locul nepotrivit poate sesiza prea târziu sau deloc.' },
      { title: 'Încrederea totală în aparat', text: 'Detectorul nu înlocuiește controlul instalației și nu ține loc de revizie.' },
      { title: 'Lipsa testelor', text: 'Un senzor netestat poate fi defect fără să știi.' },
      { title: 'Alegere doar după preț', text: 'Aparatele diferă prin tip, funcții și condițiile de montaj. Compară ce primești concret.' },
      { title: 'Ignorarea alarmei', text: 'O alarmă „falsă” se tratează ca una reală până când firma sau distribuitorul spun altfel.' },
    ] }),
    node('safety-h', 'heading', { text: 'Dacă detectorul sau mirosul te alertează', level: 'h2' }),
    node('safety', 'text', { body: para(
      'Ieși, aerisește, nu aprinde nimic și sună de afară la urgențe sau la distribuitor. Nu verifica tu conducta. Regula este generală: urmează și indicațiile distribuitorului din zona ta.',
    ) }),
    node('cost-h', 'heading', { text: 'De ce depinde costul', level: 'h2' }),
    node('cost', 'text', { body: para(
      'Costul unui montaj depinde de tipul de aparat, de prezența electrovalvei, de lungimea traseului electric, de accesul la conductă și de numărul de puncte de detecție. Un detector simplu și o soluție cu electrovalvă și notificări nu se compară direct.',
      'Cere ofertă care separă aparatul de manoperă și spune clar ce documente primești. Pentru ordine de mărime, vezi paginile de preț de mai jos.',
    ) }),
    node('compare-h', 'heading', { text: 'Cum compari ofertele', level: 'h2' }),
    node('compare', 'text', { body: para(
      'Verifică dacă oferta include aparatul, electrovalva, cablajul, manopera, testul și instrucțiunile. Întreabă cine răspunde dacă aparatul se defectează și ce se întâmplă cu electrovalva la o pană de curent.',
    ) }),
    node('choose-h', 'heading', { text: 'Cum alegi firma', level: 'h2' }),
    node('choose', 'text', { body: para(
      'Cere datele de autorizare și verifică-le pe lista ANRE. Firma bună vine să vadă locul, explică ce recomandă și de ce și nu promite că detectorul „rezolvă tot”. Pentru partea electrică, întreabă cine o face.',
    ) }),
    node('faq', 'faq_list', { title: 'Întrebări frecvente despre detectoarele de gaze' }),
    node('prices', 'price_links', { title: 'Prețuri pentru instalații de gaze' }),
    node('situation-links', 'situation_links', { title: 'Alte situații la instalații de gaze' }),
    node('guides', 'guide_links', { title: 'Ghiduri utile' }),
    node('firms', 'firms_list', { title: 'Firme care fac această lucrare', limit: '6' }),
    node('cta', 'request_cta', { title: 'Vrei ca detectorul să fie montat de o firmă autorizată?', text: 'Descrie locuința și primești oferte de la firme verificate din zona ta, fără obligații.', buttonLabel: 'Cere oferte gratuite' }),
    node('form', 'request_form', {}),
  ],
}
