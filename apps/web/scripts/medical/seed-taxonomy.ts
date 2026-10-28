/**
 * Seeds the medical taxonomy of "Rețea Medicală": the `servicii` collection (groups + categories) that doctors pick from and that drives
 * filters, routing of consult requests and the speciality / procedure pages of the sites.
 *
 *   npx tsx --env-file=.env.local scripts/medical/seed-taxonomy.ts            # plan only
 *   npx tsx --env-file=.env.local scripts/medical/seed-taxonomy.ts --apply
 *
 * Model:
 *  - specialities (TopDoctori.ro): groups `specialitati-medicale` and `specialitati-chirurgicale`;
 *  - procedures (DoctorChirurg.ro): group `chirurgie`. A surgeon lists the specialty AND the procedures they perform.
 *  - Dentistry is not here: dentists belong to a different college and register (CMDR), not the CMR register used for verification.
 * Summaries are neutral one-line definitions. The medical sections of a procedure (recovery, risks, questions for the surgeon) are NOT
 * written here: they need a doctor's review. Idempotent (externalSource + externalId); existing entries are never overwritten.
 */
import { db } from '@repo/db'

const SOURCE = 'medical-taxonomy:v1'
const LINE = 'retea-medicala'

interface Item { slug: string; title: string; summary: string; sinonime?: string[] }
const GROUPS: Item[] = [
  { slug: 'specialitati-medicale', title: 'Specialități medicale', summary: 'Specialități în care diagnosticul și tratamentul sunt, în principal, nechirurgicale.' },
  { slug: 'specialitati-chirurgicale', title: 'Specialități chirurgicale', summary: 'Specialități în care tratamentul include intervenții chirurgicale.' },
  { slug: 'chirurgie', title: 'Proceduri chirurgicale', summary: 'Intervenții chirurgicale frecvente, explicate pe înțelesul pacientului.' },
]

const MEDICAL: Item[] = [
  { slug: 'medicina-de-familie', title: 'Medicină de familie', summary: 'Primul punct de contact cu sistemul medical: control periodic, prevenție, tratamentul afecțiunilor comune și trimiteri către specialiști.', sinonime: ['medic de familie', 'medic generalist'] },
  { slug: 'medicina-interna', title: 'Medicină internă', summary: 'Diagnosticul și tratamentul bolilor adultului care afectează mai multe organe sau sisteme.', sinonime: ['internist', 'boli interne'] },
  { slug: 'cardiologie', title: 'Cardiologie', summary: 'Boli ale inimii și ale vaselor de sânge: evaluare, diagnostic și tratament.', sinonime: ['cardiolog', 'inimă', 'hipertensiune'] },
  { slug: 'dermatologie', title: 'Dermatologie', summary: 'Afecțiuni ale pielii, părului și unghiilor, plus infecții cu transmitere sexuală (dermatovenerologie).', sinonime: ['dermatolog', 'dermatovenerologie', 'piele'] },
  { slug: 'endocrinologie', title: 'Endocrinologie', summary: 'Boli ale glandelor cu secreție internă: tiroidă, suprarenale, hipofiză, metabolism hormonal.', sinonime: ['endocrinolog', 'tiroidă', 'hormoni'] },
  { slug: 'diabet-nutritie', title: 'Diabet, nutriție și boli metabolice', summary: 'Diagnosticul și tratamentul diabetului, obezității și al altor tulburări metabolice.', sinonime: ['diabetolog', 'nutriționist medic', 'obezitate'] },
  { slug: 'gastroenterologie', title: 'Gastroenterologie', summary: 'Boli ale tubului digestiv, ficatului, pancreasului și căilor biliare.', sinonime: ['gastroenterolog', 'stomac', 'ficat'] },
  { slug: 'neurologie', title: 'Neurologie', summary: 'Boli ale creierului, măduvei spinării, nervilor și mușchilor.', sinonime: ['neurolog', 'migrene', 'epilepsie'] },
  { slug: 'psihiatrie', title: 'Psihiatrie', summary: 'Evaluarea și tratamentul tulburărilor psihice, inclusiv prescrierea tratamentului medicamentos.', sinonime: ['psihiatru', 'depresie', 'anxietate'] },
  { slug: 'pediatrie', title: 'Pediatrie', summary: 'Îngrijirea medicală a copilului, de la naștere până la adolescență.', sinonime: ['pediatru', 'medic copii'] },
  { slug: 'pneumologie', title: 'Pneumologie', summary: 'Boli ale plămânilor și ale căilor respiratorii inferioare.', sinonime: ['pneumolog', 'astm', 'plămâni'] },
  { slug: 'reumatologie', title: 'Reumatologie', summary: 'Boli ale articulațiilor, oaselor și țesutului conjunctiv, inclusiv bolile autoimune.', sinonime: ['reumatolog', 'artrită', 'artroză'] },
  { slug: 'nefrologie', title: 'Nefrologie', summary: 'Boli ale rinichilor și tratamentul insuficienței renale, inclusiv dializa.', sinonime: ['nefrolog', 'rinichi'] },
  { slug: 'hematologie', title: 'Hematologie', summary: 'Boli ale sângelui și ale organelor care îl produc.', sinonime: ['hematolog', 'anemie'] },
  { slug: 'oncologie-medicala', title: 'Oncologie medicală', summary: 'Tratamentul medicamentos al cancerului: chimioterapie, imunoterapie, terapii țintite.', sinonime: ['oncolog', 'cancer'] },
  { slug: 'boli-infectioase', title: 'Boli infecțioase', summary: 'Diagnosticul și tratamentul infecțiilor cauzate de bacterii, virusuri, paraziți sau fungi.', sinonime: ['infecționist'] },
  { slug: 'alergologie-imunologie', title: 'Alergologie și imunologie clinică', summary: 'Alergii, boli ale sistemului imunitar și testarea alergică.', sinonime: ['alergolog', 'alergii'] },
  { slug: 'geriatrie', title: 'Geriatrie', summary: 'Îngrijirea medicală a persoanelor în vârstă și a afecțiunilor asociate îmbătrânirii.', sinonime: ['geriatru'] },
  { slug: 'recuperare-medicala', title: 'Recuperare medicală', summary: 'Medicină fizică și de reabilitare: refacerea funcției după boală, accident sau operație.', sinonime: ['fizioterapie medic', 'balneologie', 'recuperare'] },
  { slug: 'medicina-muncii', title: 'Medicina muncii', summary: 'Evaluarea sănătății în raport cu locul de muncă și controalele medicale ale angajaților.', sinonime: ['medicina muncii'] },
  { slug: 'medicina-sportiva', title: 'Medicină sportivă', summary: 'Evaluarea și îngrijirea medicală a sportivilor și a persoanelor active.', sinonime: ['medic sportiv'] },
  { slug: 'radiologie-imagistica', title: 'Radiologie și imagistică medicală', summary: 'Diagnostic prin radiografie, ecografie, tomografie și rezonanță magnetică.', sinonime: ['radiolog', 'ecografie', 'RMN', 'CT'] },
  { slug: 'medicina-de-laborator', title: 'Medicină de laborator', summary: 'Analize de laborator și interpretarea lor medicală.', sinonime: ['analize', 'laborator'] },
  { slug: 'anestezie-terapie-intensiva', title: 'Anestezie și terapie intensivă', summary: 'Anestezia pentru intervenții și îngrijirea pacienților în stare critică.', sinonime: ['anestezist', 'ATI'] },
  { slug: 'medicina-de-urgenta', title: 'Medicină de urgență', summary: 'Evaluarea și stabilizarea pacienților cu afecțiuni acute sau accidente.', sinonime: ['urgențe', 'UPU'] },
  { slug: 'neonatologie', title: 'Neonatologie', summary: 'Îngrijirea nou-născuților, în special a celor prematuri sau bolnavi.', sinonime: ['neonatolog'] },
]

const SURGICAL: Item[] = [
  { slug: 'chirurgie-generala', title: 'Chirurgie generală', summary: 'Intervenții la abdomen, peretele abdominal, tiroidă și alte organe, care nu țin de o specialitate chirurgicală dedicată.', sinonime: ['chirurg', 'chirurg generalist'] },
  { slug: 'ortopedie-traumatologie', title: 'Ortopedie și traumatologie', summary: 'Oase, articulații, ligamente și mușchi: tratament chirurgical și conservator, inclusiv după accidente.', sinonime: ['ortoped', 'traumatolog', 'fracturi'] },
  { slug: 'neurochirurgie', title: 'Neurochirurgie', summary: 'Intervenții chirurgicale la creier, măduva spinării, coloană și nervi periferici.', sinonime: ['neurochirurg', 'coloană', 'hernie de disc'] },
  { slug: 'chirurgie-cardiovasculara', title: 'Chirurgie cardiovasculară', summary: 'Intervenții chirurgicale la inimă și la vasele mari de sânge.', sinonime: ['chirurg cardiac', 'by-pass'] },
  { slug: 'chirurgie-toracica', title: 'Chirurgie toracică', summary: 'Intervenții la plămâni, pleură, mediastin și peretele toracic.', sinonime: ['chirurg toracic'] },
  { slug: 'chirurgie-vasculara', title: 'Chirurgie vasculară', summary: 'Intervenții pe artere și vene, de la varice la bolile arterelor.', sinonime: ['chirurg vascular', 'varice', 'artere'] },
  { slug: 'chirurgie-plastica', title: 'Chirurgie plastică, estetică și microchirurgie reconstructivă', summary: 'Intervenții reconstructive și estetice la piele, sân, față și corp, inclusiv după arsuri sau accidente.', sinonime: ['chirurg plastician', 'estetică', 'reconstructivă'] },
  { slug: 'urologie', title: 'Urologie', summary: 'Boli ale aparatului urinar la ambele sexe și ale aparatului genital masculin.', sinonime: ['urolog', 'prostată', 'calculi renali'] },
  { slug: 'orl', title: 'Otorinolaringologie (ORL)', summary: 'Boli ale urechii, nasului, gâtului și laringelui, medicale și chirurgicale.', sinonime: ['ORL', 'otorinolaringolog', 'amigdale'] },
  { slug: 'oftalmologie', title: 'Oftalmologie', summary: 'Boli ale ochiului și ale anexelor lui, tratament medical și chirurgical.', sinonime: ['oftalmolog', 'ochi', 'cataractă'] },
  { slug: 'obstetrica-ginecologie', title: 'Obstetrică-ginecologie', summary: 'Sarcină, naștere și boli ale aparatului genital feminin.', sinonime: ['ginecolog', 'obstetrician', 'sarcină'] },
  { slug: 'chirurgie-pediatrica', title: 'Chirurgie pediatrică', summary: 'Intervenții chirurgicale la copii, de la nou-născut la adolescent.', sinonime: ['chirurg pediatru', 'chirurgie copii'] },
  { slug: 'chirurgie-maxilo-faciala', title: 'Chirurgie oro-maxilo-facială', summary: 'Intervenții la maxilar, mandibulă, față și cavitatea bucală.', sinonime: ['chirurg maxilo-facial'] },
]

const PROCEDURES: Item[] = [
  { slug: 'hernii', title: 'Hernii', summary: 'Tratamentul chirurgical al herniilor inghinale, ombilicale, ale liniei albe și postoperatorii.', sinonime: ['hernie', 'hernie inghinală', 'hernie ombilicală', 'eventrație'] },
  { slug: 'colecistectomie', title: 'Colecistectomie (operația de vezică biliară)', summary: 'Îndepărtarea chirurgicală a vezicii biliare, de obicei laparoscopic, în caz de calculi sau inflamație.', sinonime: ['vezică biliară', 'calculi biliari', 'colecist'] },
  { slug: 'apendicectomie', title: 'Apendicectomie', summary: 'Îndepărtarea chirurgicală a apendicelui inflamat.', sinonime: ['apendicită', 'apendice'] },
  { slug: 'chirurgie-bariatrica', title: 'Chirurgie bariatrică (a obezității)', summary: 'Intervenții care reduc volumul stomacului sau modifică traseul digestiv, pentru obezitate severă.', sinonime: ['sleeve', 'bypass gastric', 'obezitate', 'slăbire chirurgicală'] },
  { slug: 'chirurgia-tiroidei', title: 'Chirurgia tiroidei', summary: 'Intervenții pe glanda tiroidă: noduli, guși, hipertiroidie sau cancer.', sinonime: ['tiroidectomie', 'nodul tiroidian', 'gușă'] },
  { slug: 'varice', title: 'Varice (chirurgia venelor)', summary: 'Tratamentul chirurgical și minim invaziv al varicelor și al insuficienței venoase.', sinonime: ['varice', 'safenă', 'insuficiență venoasă'] },
  { slug: 'chirurgie-proctologica', title: 'Chirurgie proctologică', summary: 'Intervenții pentru hemoroizi, fisuri anale, fistule și alte afecțiuni ale zonei anale.', sinonime: ['hemoroizi', 'fisură anală', 'fistulă'] },
  { slug: 'artroscopie', title: 'Artroscopie', summary: 'Intervenție minim invazivă prin care articulația (genunchi, umăr, șold) este examinată și tratată cu o cameră mică.', sinonime: ['artroscopie genunchi', 'menisc', 'ligament încrucișat'] },
  { slug: 'proteze-genunchi-sold', title: 'Proteze de genunchi și de șold', summary: 'Înlocuirea articulației deteriorate cu o proteză, de obicei în artroza avansată.', sinonime: ['artroplastie', 'protezare', 'coxartroză', 'gonartroză'] },
  { slug: 'chirurgia-coloanei', title: 'Chirurgia coloanei vertebrale', summary: 'Intervenții pentru hernie de disc, stenoză de canal și alte afecțiuni ale coloanei.', sinonime: ['hernie de disc', 'discectomie', 'stenoză spinală'] },
  { slug: 'sindrom-tunel-carpian', title: 'Sindromul de tunel carpian', summary: 'Eliberarea chirurgicală a nervului median de la nivelul încheieturii mâinii.', sinonime: ['tunel carpian', 'nerv median'] },
  { slug: 'cataracta', title: 'Cataractă', summary: 'Înlocuirea cristalinului opacifiat cu unul artificial.', sinonime: ['operație cataractă', 'cristalin'] },
  { slug: 'amigdalectomie', title: 'Amigdalectomie și adenoidectomie', summary: 'Îndepărtarea chirurgicală a amigdalelor sau a vegetațiilor adenoide.', sinonime: ['amigdale', 'vegetații'] },
  { slug: 'septoplastie-rinoplastie', title: 'Septoplastie și rinoplastie', summary: 'Intervenții la nas, pentru respirație sau pentru aspect.', sinonime: ['sept nazal', 'operație nas', 'rinoplastie'] },
  { slug: 'litiaza-urinara', title: 'Calculi urinari (litiază urinară)', summary: 'Tratamentul chirurgical și endoscopic al pietrelor de la rinichi și de la căile urinare.', sinonime: ['pietre la rinichi', 'calculi renali', 'ureteroscopie'] },
  { slug: 'chirurgia-prostatei', title: 'Chirurgia prostatei', summary: 'Intervenții pentru adenomul de prostată sau pentru cancer de prostată.', sinonime: ['adenom de prostată', 'rezecție prostată', 'prostatectomie'] },
  { slug: 'histerectomie', title: 'Histerectomie', summary: 'Îndepărtarea chirurgicală a uterului, pentru fibroame, sângerări sau alte afecțiuni.', sinonime: ['operație uter', 'fibrom uterin'] },
  { slug: 'chirurgia-sanului', title: 'Chirurgia sânului', summary: 'Intervenții pentru tumori ale sânului, reducție, reconstrucție sau augmentare.', sinonime: ['mastectomie', 'reducție mamară', 'augmentare mamară'] },
]

function plan() {
  const rows: { slug: string; title: string; summary: string; data: Record<string, unknown> }[] = []
  for (const g of GROUPS) rows.push({ slug: g.slug, title: g.title, summary: g.summary, data: { tip: 'grup' } })
  for (const c of MEDICAL) rows.push({ slug: c.slug, title: c.title, summary: c.summary, data: { tip: 'categorie', parinte: 'specialitati-medicale', ...(c.sinonime ? { sinonime: c.sinonime } : {}) } })
  for (const c of SURGICAL) rows.push({ slug: c.slug, title: c.title, summary: c.summary, data: { tip: 'categorie', parinte: 'specialitati-chirurgicale', ...(c.sinonime ? { sinonime: c.sinonime } : {}) } })
  for (const c of PROCEDURES) rows.push({ slug: c.slug, title: c.title, summary: c.summary, data: { tip: 'categorie', parinte: 'chirurgie', ...(c.sinonime ? { sinonime: c.sinonime } : {}) } })
  return rows
}

async function main() {
  const apply = process.argv.includes('--apply')
  const line = await db.businessLine.findUnique({ where: { slug: LINE }, select: { id: true } })
  if (!line) throw new Error(`Linia ${LINE} nu există`)
  const col = await db.websiteCollection.findUnique({ where: { businessLineId_key: { businessLineId: line.id, key: 'servicii' } }, select: { id: true } })
  if (!col) throw new Error('Colecția servicii nu există: rulează întâi setup-website-channel.ts')

  const rows = plan()
  const slugs = rows.map((r) => r.slug)
  if (new Set(slugs).size !== slugs.length) throw new Error('Slug-uri duplicate în plan')
  const existing = new Set((await db.websiteEntry.findMany({ where: { businessLineId: line.id, collectionId: col.id, slug: { in: slugs } }, select: { slug: true } })).map((e) => e.slug))
  const todo = rows.filter((r) => !existing.has(r.slug))
  console.log(`Plan: ${rows.length} intrări (${GROUPS.length} grupe, ${MEDICAL.length} specialități medicale, ${SURGICAL.length} chirurgicale, ${PROCEDURES.length} proceduri); existente ${existing.size}; de creat ${todo.length}`)
  if (!apply) { console.log('Probă: nu s-a scris nimic. Adaugă --apply.'); return }

  const now = new Date()
  for (const r of todo) {
    await db.websiteEntry.create({ data: { businessLineId: line.id, collectionId: col.id, slug: r.slug, title: r.title, summary: r.summary, status: 'published', publishedAt: now, data: r.data as never, externalSource: SOURCE, externalId: r.slug } })
  }
  console.log(`Create ${todo.length} intrări.`)
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) }).finally(() => db.$disconnect())
