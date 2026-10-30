/**
 * Idempotent: creates the pilot "afecțiuni" (taxonomy type `situatie`, under a specialty) as DRAFTS.
 *
 *   npx tsx --env-file=.env.local scripts/medical/seed-afectiuni.ts
 *
 * The texts are general health education prepared for review: nothing is public until a doctor has reviewed it, filled `medic_recenzor` and
 * `data_revizuirii` in the admin editor and published the entry (the frontend also hides any afecțiune without a reviewer). A rerun only
 * refreshes entries that are still drafts without a reviewer, so a reviewed text is never overwritten.
 */
import { db } from '@repo/db'

const LINE = 'retea-medicala'
const PARENT = 'chirurgie-generala'

interface Afectiune { slug: string; title: string; summary: string; body: string; sinonime: string[]; simptome: string[]; semne_alarma: string[]; tratament: string[]; proceduri_legate: string[]; intrebari: string[] }

const A: Afectiune[] = [
  {
    slug: 'hernie-inghinala', title: 'Hernie inghinală',
    summary: 'Hernia inghinală este o umflătură în zona inghinală, produsă când o parte din conținutul abdomenului iese printr-un punct slab al peretelui abdominal.',
    body: 'În hernia inghinală, grăsime sau o ansă intestinală împinge printr-un punct slab al peretelui abdominal, în regiunea inghinală. Este mai frecventă la bărbați și poate apărea la orice vârstă.\n\nUmflătura se vede mai ales când stai în picioare, tuși sau faci efort și poate dispărea când te culci. O hernie nu se vindecă de la sine, dar momentul și felul tratamentului se stabilesc de medic, după ce te examinează.',
    sinonime: ['hernie la inghină', 'hernie inghinală la bărbați', 'umflătură în inghină'],
    simptome: ['umflătură în zona inghinală, uneori coborâtă spre scrot', 'umflătura se vede mai ales la tuse, efort sau în picioare', 'senzație de greutate, tensiune sau disconfort în inghină', 'uneori durere la efort sau la ridicarea de greutăți'],
    semne_alarma: ['durere intensă și bruscă în zona herniei', 'umflătură tare, care nu mai poate fi împinsă la loc', 'roșeață sau culoare închisă a pielii deasupra umflăturii', 'greață, vărsături sau oprirea tranzitului intestinal'],
    tratament: ['hernia nu dispare singură; tratamentul de bază este chirurgical', 'o hernie mică, fără simptome, poate fi doar urmărită, la decizia medicului', 'operația se poate face clasic sau laparoscopic, de obicei cu o plasă care întărește peretele', 'o centură de susținere poate ușura disconfortul, dar nu vindecă hernia'],
    proceduri_legate: ['hernii'],
    intrebari: ['Hernia inghinală poate dispărea fără operație? | Nu. Poate rămâne mică și fără simptome mult timp, dar nu se închide singură. Decizia de a opera sau a urmări o ia medicul, după examinare.', 'Când este o urgență? | Dacă umflătura devine dureroasă, tare și nu mai poate fi împinsă la loc, mai ales cu greață sau vărsături, mergi imediat la urgențe sau sună la 112.', 'Cum se pune diagnosticul? | De obicei prin examen clinic, uneori completat cu o ecografie a regiunii inghinale.'],
  },
  {
    slug: 'hernie-ombilicala', title: 'Hernie ombilicală',
    summary: 'Hernia ombilicală este o umflătură în jurul buricului, apărută printr-un punct slab al peretelui abdominal.',
    body: 'Hernia ombilicală apare când țesuturi din abdomen ies prin peretele abdominal în zona buricului. Se întâlnește la sugari, dar și la adulți, mai ales când presiunea din abdomen este crescută: sarcină, kilograme în plus, tuse cronică sau lichid în abdomen.\n\nLa sugari și copii mici multe hernii ombilicale se închid singure, de aceea medicul decide când e nevoie de tratament. La adulți, ea nu se închide spontan.',
    sinonime: ['hernie la buric', 'hernie de buric', 'umflătură la buric'],
    simptome: ['umflătură moale în jurul buricului, mai vizibilă la tuse sau efort', 'disconfort sau durere la buric la efort', 'umflătura poate dispărea sau se poate micșora când stai culcat'],
    semne_alarma: ['durere intensă la buric, apărută brusc', 'umflătură tare, care nu mai poate fi împinsă la loc', 'roșeață sau culoare vânătă a pielii deasupra umflăturii', 'vărsături sau oprirea tranzitului intestinal'],
    tratament: ['la sugari se urmărește, pentru că multe se închid singure în primii ani', 'la adulți tratamentul este chirurgical, cu închiderea defectului, de obicei cu o plasă', 'momentul operației depinde de mărime, simptome și de alte boli ale pacientului'],
    proceduri_legate: ['hernii'],
    intrebari: ['Hernia ombilicală la copil trebuie operată? | De multe ori nu imediat. Medicul pediatru sau chirurgul poate recomanda urmărirea și decide dacă defectul se închide singur sau dacă e nevoie de operație.', 'Poate apărea hernie ombilicală în sarcină? | Da, presiunea crescută din abdomen poate favoriza apariția ei. Dacă observi o umflătură la buric, discută-o cu medicul.', 'Ce fac dacă devine dureroasă? | Dacă umflătura este dureroasă, tare și nu mai poate fi împinsă la loc, mergi la urgențe sau sună la 112.'],
  },
  {
    slug: 'calculi-biliari', title: 'Calculi biliari (litiază biliară)',
    summary: 'Calculii biliari sunt depozite solide formate în vezicula biliară. Mulți nu dau simptome, dar pot provoca dureri puternice și complicații.',
    body: 'Vezicula biliară stochează bila produsă de ficat. Uneori, componentele bilei formează depozite solide, numite calculi, de la dimensiunea unui bob de nisip până la a unei mingi de golf.\n\nMulți oameni află de calculi întâmplător, la o ecografie, și nu au simptome. Alții au crize de durere (colici biliare), de obicei după mese bogate în grăsimi. Tratamentul depinde de simptome și de riscul de complicații.',
    sinonime: ['pietre la fiere', 'pietre la vezica biliară', 'litiază biliară', 'colică biliară', 'calculi la fiere'],
    simptome: ['durere în partea dreaptă sus a abdomenului sau în zona stomacului, uneori cu iradiere spre spate sau umărul drept', 'durerea apare adesea după mese grase și poate dura de la 30 de minute la câteva ore', 'greață sau vărsături în timpul crizei', 'balonare și disconfort după mese'],
    semne_alarma: ['durere care nu cedează după câteva ore', 'febră sau frisoane', 'îngălbenirea pielii sau a ochilor (icter)', 'urină foarte închisă la culoare sau scaune decolorate', 'vărsături repetate'],
    tratament: ['calculii descoperiți întâmplător, fără simptome, se urmăresc de obicei', 'când dau simptome, tratamentul uzual este înlăturarea chirurgicală a veziculei biliare (colecistectomia), de regulă laparoscopică', 'dieta ajută la reducerea crizelor, dar nu elimină calculii'],
    proceduri_legate: ['colecistectomie'],
    intrebari: ['Pot trăi fără vezică biliară? | Da. Ficatul produce bila în continuare, iar după operație digestia se adaptează, uneori cu o perioadă de acomodare. Detaliile le discuți cu medicul.', 'Trebuie operați toți calculii biliari? | Nu neapărat. Calculii fără simptome se urmăresc de obicei. Operația se discută când apar crize sau complicații.', 'Se pot dizolva calculii cu dietă sau remedii? | Dieta poate reduce crizele, dar nu elimină calculii. Nu amâna evaluarea medicală dacă ai dureri repetate.'],
  },
  {
    slug: 'colecistita-acuta', title: 'Colecistită acută',
    summary: 'Colecistita acută este inflamația veziculei biliare, cel mai des cauzată de un calcul care blochează scurgerea bilei. Necesită evaluare medicală urgentă.',
    body: 'În colecistita acută, vezicula biliară se inflamează, de cele mai multe ori pentru că un calcul îi blochează canalul de scurgere. Durerea este persistentă, spre deosebire de colica biliară, care trece de obicei după câteva ore.\n\nEste o afecțiune care cere evaluare medicală rapidă, pentru că poate duce la complicații. Tratamentul se face de obicei în spital.',
    sinonime: ['inflamația veziculei biliare', 'inflamație la fiere', 'colecistită'],
    simptome: ['durere continuă în partea dreaptă sus a abdomenului, uneori spre umărul drept', 'sensibilitate la atingerea zonei', 'febră', 'greață și vărsături', 'lipsa poftei de mâncare'],
    semne_alarma: ['durere puternică, care durează mai multe ore', 'febră mare sau frisoane', 'îngălbenirea pielii sau a ochilor', 'stare generală proastă, amețeală sau confuzie'],
    tratament: ['evaluarea se face urgent, cu examen clinic, analize și ecografie', 'tratamentul poate include internare, hidratare, medicație pentru durere și antibiotice', 'de regulă se recomandă înlăturarea chirurgicală a veziculei biliare; momentul operației îl stabilește chirurgul'],
    proceduri_legate: ['colecistectomie'],
    intrebari: ['Colecistita acută este o urgență? | Da. Dacă ai durere continuă în dreapta sus a abdomenului, cu febră sau vărsături, mergi la urgențe.', 'Ce deosebește colecistita de colica biliară? | Colica biliară trece de obicei în câteva ore. În colecistită durerea persistă și apar de regulă febra și sensibilitatea abdomenului. Diagnosticul îl pune medicul.', 'Este nevoie de operație? | De obicei se recomandă operația de înlăturare a veziculei, la un moment ales de chirurg în funcție de starea ta.'],
  },
  {
    slug: 'apendicita-acuta', title: 'Apendicită acută',
    summary: 'Apendicita acută este inflamația apendicelui și este o urgență chirurgicală frecventă. Durerea abdominală care se mută în dreapta jos cere evaluare medicală imediată.',
    body: 'Apendicele este o mică prelungire a intestinului gros, în partea dreaptă jos a abdomenului. Când se inflamează, apare apendicita acută. Poate apărea la orice vârstă, cel mai des la copii mari și adulți tineri.\n\nDurerea începe de obicei în jurul buricului și, după câteva ore, se mută în dreapta jos. Neglijată, apendicita poate duce la perforație și la complicații grave, de aceea nu se amână consultul.',
    sinonime: ['durere în dreapta jos a abdomenului', 'inflamația apendicelui', 'dureri de apendice', 'apendicită'],
    simptome: ['durere care începe în jurul buricului și se mută în dreapta jos a abdomenului', 'lipsa poftei de mâncare', 'greață sau vărsături', 'febră ușoară', 'durere mai mare la mișcare, tuse sau la apăsarea zonei'],
    semne_alarma: ['durere abdominală intensă, care se agravează', 'febră mare sau frisoane', 'abdomen tare, dureros la atingere', 'vărsături repetate'],
    tratament: ['necesită evaluare medicală urgentă: nu aștepta să treacă singură durerea', 'nu lua pe cont propriu calmante puternice sau laxative înainte de consult, pentru că pot masca semnele', 'tratamentul uzual este înlăturarea chirurgicală a apendicelui (apendicectomia), laparoscopic sau clasic', 'în unele cazuri selectate, medicul poate discuta tratamentul cu antibiotice'],
    proceduri_legate: ['apendicectomie'],
    intrebari: ['Cum recunosc apendicita? | Un semn tipic este durerea care începe în jurul buricului și se mută în dreapta jos, cu lipsa poftei de mâncare și greață. Diagnosticul îl stabilește însă doar medicul.', 'Pot aștepta până dimineață? | Dacă durerea este puternică sau se agravează, nu. Mergi la urgențe sau sună la 112.', 'Cât durează recuperarea după operație? | Depinde de tipul operației și de starea ta. Medicul chirurg îți spune ce poți face și când te poți întoarce la activități.'],
  },
  {
    slug: 'nodul-tiroidian', title: 'Nodul tiroidian',
    summary: 'Nodulul tiroidian este o formațiune în glanda tiroidă. Este foarte frecvent și, în majoritatea cazurilor, benign, dar are nevoie de evaluare medicală.',
    body: 'Tiroida este o glandă situată în partea din față a gâtului. Un nodul este o formațiune care se dezvoltă în interiorul ei. Nodulii sunt foarte frecvenți și, în marea majoritate, benigni, dar fiecare trebuie evaluat.\n\nDeseori sunt descoperiți întâmplător, la o ecografie de gât. Evaluarea implică de obicei examen clinic, ecografie tiroidiană, analize hormonale și, la nevoie, puncție cu ac fin. Rezultatele stabilesc dacă nodulul se urmărește sau se tratează.',
    sinonime: ['nodul la tiroidă', 'nodul pe tiroidă', 'noduli tiroidieni', 'formațiune la tiroidă'],
    simptome: ['de obicei niciunul; nodulul este descoperit la o ecografie', 'uneori o umflătură vizibilă sau palpabilă la baza gâtului', 'senzație de presiune în gât', 'dificultate la înghițit sau la respirat, la noduli mari'],
    semne_alarma: ['creștere rapidă a unei umflături în gât', 'răgușeală care persistă', 'dificultate la înghițit sau la respirat', 'ganglioni măriți în gât'],
    tratament: ['alegerea tratamentului depinde de rezultatele evaluării: ecografie, analize și, la nevoie, puncție', 'multe noduli benigni se urmăresc periodic', 'în funcție de caz se poate recomanda medicație sau tratament chirurgical (înlăturarea unei părți din tiroidă sau a ei întregi)', 'evaluarea o fac de obicei endocrinologul și, când e nevoie, chirurgul'],
    proceduri_legate: ['chirurgia-tiroidei'],
    intrebari: ['Este nodulul tiroidian cancer? | Cei mai mulți noduli sunt benigni. Singur nu poți ști: de aceea este nevoie de ecografie și, uneori, de puncție cu ac fin.', 'Trebuie operat orice nodul? | Nu. Mulți noduli se urmăresc doar periodic. Medicul propune operația în funcție de rezultatele evaluării, de mărime și de simptome.', 'La ce medic merg? | De obicei la endocrinolog, care te poate îndruma, la nevoie, către un chirurg.'],
  },
  {
    slug: 'gusa-tiroidiana', title: 'Gușă tiroidiană',
    summary: 'Gușa este mărirea de volum a glandei tiroide. Poate fi difuză sau cu noduli și necesită evaluare pentru a-i stabili cauza.',
    body: 'Gușa înseamnă o tiroidă mărită. Mărirea poate cuprinde toată glanda sau poate fi formată din unul sau mai mulți noduli. Cauzele sunt diferite: lipsa de iod, boli autoimune ale tiroidei, noduli și altele.\n\nUnele gușe nu dau simptome. Cele mari pot apăsa pe structurile din gât. Evaluarea include ecografie și analize hormonale, iar tratamentul depinde de cauză, de mărime și de simptome.',
    sinonime: ['tiroidă mărită', 'guşă', 'umflătură în față gâtului', 'gușă nodulară'],
    simptome: ['gât mai gros sau umflătură vizibilă în partea din față a gâtului', 'senzație de strângere sau presiune în gât', 'tuse sau răgușeală persistente', 'dificultate la înghițit sau la respirat, în gușile mari', 'uneori semne de tiroidă prea activă sau prea puțin activă'],
    semne_alarma: ['dificultate la respirat sau la înghițit', 'creștere rapidă a gușii', 'răgușeală care nu trece', 'ganglioni măriți în gât'],
    tratament: ['cauza se stabilește prin ecografie, analize hormonale și, uneori, alte investigații', 'unele gușe se urmăresc periodic', 'în funcție de cauză se poate recomanda medicație, alte tratamente specifice sau operație', 'operația se discută mai ales când gușa apasă pe structurile din gât sau există suspiciuni la nodulii ei'],
    proceduri_legate: ['chirurgia-tiroidei'],
    intrebari: ['Gușa se vindecă? | Depinde de cauză. Unele forme se pot controla cu tratament medicamentos, altele se urmăresc sau se operează. Medicul stabilește varianta potrivită.', 'Ce analize se fac? | De obicei ecografie tiroidiană și analize hormonale (de exemplu TSH). Medicul poate cere și alte investigații.', 'Când este necesară operația? | De regulă când gușa este mare și produce simptome de compresiune sau când există suspiciune la unul dintre noduli.'],
  },
  {
    slug: 'hemoroizi', title: 'Hemoroizi',
    summary: 'Hemoroizii sunt vene dilatate din zona anusului. Pot sângera și provoca disconfort, dar sângerarea de la scaun trebuie evaluată de medic.',
    body: 'Hemoroizii sunt formațiuni vasculare din canalul anal. Se pot umfla și produce disconfort, mâncărime, sângerare sau prolaps. Printre factori se numără constipația, efortul la defecație, statul îndelungat pe toaletă și sarcina.\n\nMulte forme ușoare se ameliorează prin schimbări de obicei. Dar nu orice sângerare la scaun este de la hemoroizi, așa că este important consultul medical, mai ales dacă apare pentru prima dată sau persistă.',
    sinonime: ['hemoroizi interni', 'hemoroizi externi', 'sângerare la scaun', 'cheaguri la anus', 'hemoroizi la sarcină'],
    simptome: ['sânge roșu aprins pe hârtie sau pe scaun, de obicei fără durere', 'mâncărime sau iritație în zona anală', 'disconfort sau senzație de plenitudine', 'umflătură sau „bulgăre” care iese prin anus, mai ales după scaun', 'durere, în special când se formează un cheag'],
    semne_alarma: ['sângerare abundentă sau care persistă', 'sânge închis la culoare sau amestecat cu scaunul', 'modificări noi ale tranzitului intestinal', 'slăbire fără motiv, oboseală sau paloare', 'durere intensă bruscă în zona anală'],
    tratament: ['măsuri generale: mai multe fibre și lichide, evitarea efortului și a statului lung pe toaletă', 'medicamente locale sau orale, la recomandarea medicului', 'proceduri ambulatorii (de exemplu ligaturi cu inele elastice) pentru unele forme', 'operația se rezervă formelor avansate sau care nu răspund la alte tratamente'],
    proceduri_legate: ['chirurgie-proctologica'],
    intrebari: ['Orice sângerare la scaun înseamnă hemoroizi? | Nu. Sângerarea poate avea și alte cauze, de aceea trebuie evaluată de medic, mai ales dacă apare prima dată, persistă sau după vârsta de 45–50 de ani.', 'Hemoroizii dispar singuri? | Formele ușoare se pot ameliora cu schimbări de obicei. Dacă simptomele revin sau se agravează, medicul poate propune alte tratamente.', 'Ce medic tratează hemoroizii? | Medicul chirurg sau proctolog, după un consult și un examen al zonei anale.'],
  },
  {
    slug: 'fisura-anala', title: 'Fisură anală',
    summary: 'Fisura anală este o mică ruptură în mucoasa canalului anal, care provoacă durere ascuțită la scaun și uneori sângerare.',
    body: 'Fisura anală este o crăpătură în mucoasa de la marginea anusului. De obicei apare după scaune tari sau după episoade de diaree, iar durerea ascuțită, în timpul scaunului și după el, este semnul ei caracteristic.\n\nFisurile recente se vindecă adesea cu măsuri simple. Cele care durează mai mult de câteva săptămâni sunt considerate cronice și pot avea nevoie de alt tratament. Diagnosticul îl pune medicul după un examen al zonei.',
    sinonime: ['crăpătură la anus', 'durere la scaun', 'durere anală', 'fisură la anus'],
    simptome: ['durere ascuțită, ca o tăietură, la scaun, care poate dura minute sau ore', 'puțin sânge roșu aprins pe hârtie sau pe scaun', 'mâncărime sau iritație', 'spasm sau strângere dureroasă a mușchiului anal'],
    semne_alarma: ['durere foarte intensă sau în creștere', 'umflătură dureroasă, cu roșeață sau febră', 'secreție sau abces lângă anus', 'sângerare abundentă sau persistentă'],
    tratament: ['scaune moi: fibre, lichide, uneori medicamente prescrise de medic', 'băi calde de șezut și igienă blândă a zonei', 'medicamente locale la recomandarea medicului', 'fisurile cronice sau care nu răspund la tratament se pot opera'],
    proceduri_legate: ['chirurgie-proctologica'],
    intrebari: ['Cât durează vindecarea unei fisuri? | Fisurile recente se vindecă adesea în câteva săptămâni, cu tratament și scaune moi. Dacă durerea persistă, discută cu medicul.', 'Poate fi confundată cu hemoroizii? | Da, simptomele se pot asemăna. Diferența o face examenul medical.', 'Când se operează? | Când fisura este cronică sau nu răspunde la tratamentul local și durerea persistă. Medicul chirurg stabilește varianta potrivită.'],
  },
  {
    slug: 'chist-pilonidal', title: 'Chist pilonidal',
    summary: 'Chistul pilonidal este o cavitate în șanțul dintre fese, care se poate infecta și forma un abces. Poate reveni, de aceea merită evaluat de un chirurg.',
    body: 'Chistul pilonidal apare în partea de sus a șanțului interfesier, la baza coloanei. Se asociază cu fire de păr care pătrund în piele și cu iritația repetată a zonei. Este mai frecvent la adulți tineri și la cei care stau mult așezați.\n\nPoate rămâne fără simptome sau se poate infecta, formând un abces dureros. Tratamentul depinde de forma bolii: abcesul se drenează, iar formele cronice sau recidivante se pot opera.',
    sinonime: ['chist la coccis', 'abces la baza coloanei', 'chist în șanțul fesier', 'sinus pilonidal'],
    simptome: ['mică deschidere sau „gaură” în pielea de la baza coloanei', 'durere, mai ales la așezat', 'umflătură roșie și caldă la atingere', 'secreție cu miros neplăcut sau cu puroi'],
    semne_alarma: ['durere puternică și umflătură care crește rapid', 'febră sau frisoane', 'roșeață care se extinde în jurul zonei'],
    tratament: ['abcesul se tratează prin incizie și drenaj, la medic', 'formele cronice sau care revin se pot opera, prin mai multe tehnici alese de chirurg', 'îngrijirea zonei, igiena și îndepărtarea părului sunt importante și după tratament', 'recurența este posibilă, de aceea controalele sunt importante'],
    proceduri_legate: [],
    intrebari: ['Chistul pilonidal dispare singur? | Un abces nu se vindecă de obicei fără drenaj. Formele cronice tind să revină. Merită un consult chirurgical.', 'Se poate opera? | Da. Există mai multe tehnici. Chirurgul alege varianta în funcție de forma bolii și de localizare.', 'Poate reveni după operație? | Da, există risc de recidivă. Îngrijirea zonei și controalele recomandate de medic îl pot reduce.'],
  },
]

async function main() {
  const line = await db.businessLine.findUnique({ where: { slug: LINE }, select: { id: true } })
  if (!line) throw new Error('Linia retea-medicala nu există')
  const col = await db.websiteCollection.findUniqueOrThrow({ where: { businessLineId_key: { businessLineId: line.id, key: 'servicii' } }, select: { id: true } })
  const parent = await db.websiteEntry.findFirst({ where: { businessLineId: line.id, collectionId: col.id, slug: PARENT }, select: { data: true } })
  if ((parent?.data as { tip?: string } | null)?.tip !== 'categorie') throw new Error(`Categoria ${PARENT} nu există`)
  const known = new Set((await db.websiteEntry.findMany({ where: { businessLineId: line.id, collectionId: col.id }, select: { slug: true } })).map((e) => e.slug))

  for (const a of A) {
    const bad = a.proceduri_legate.filter((s) => !known.has(s))
    if (bad.length) throw new Error(`${a.slug}: proceduri necunoscute: ${bad.join(', ')}`)
    const slug = `${PARENT}--${a.slug}`
    const data = { tip: 'situatie', parinte: PARENT, sinonime: a.sinonime, simptome: a.simptome, semne_alarma: a.semne_alarma, tratament: a.tratament, proceduri_legate: a.proceduri_legate, intrebari: a.intrebari }
    const existing = await db.websiteEntry.findFirst({ where: { businessLineId: line.id, collectionId: col.id, slug }, select: { id: true, status: true, data: true } })
    if (!existing) {
      await db.websiteEntry.create({ data: { businessLineId: line.id, collectionId: col.id, slug, title: a.title, summary: a.summary, body: a.body, status: 'draft', data } })
      console.log(`creat (ciornă): ${slug}`)
    } else if (existing.status === 'draft' && !(existing.data as { medic_recenzor?: string } | null)?.medic_recenzor) {
      await db.websiteEntry.update({ where: { id: existing.id }, data: { title: a.title, summary: a.summary, body: a.body, data } })
      console.log(`actualizat (ciornă): ${slug}`)
    } else console.log(`lăsat neschimbat (revizuit sau publicat): ${slug}`)
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) }).finally(() => db.$disconnect())
