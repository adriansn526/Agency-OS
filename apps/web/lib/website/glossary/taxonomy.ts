/**
 * Service taxonomy of the portal glossary (controlled vocabulary).
 *
 * Firms pick categories from here (WebsiteEntry.data.servicii = category slugs); the free-text speciality only adds detail.
 * The same slugs drive filters, routing of quote requests and the glossary pages, so the portal's generic category pages and a firm's
 * own pages never compete for the same wording: the category explains the service, the firm page is about that firm.
 * Categories start from the CAEN-derived specialities already stored on the imported firms.
 */

export interface Category { slug: string; title: string; group: string; summary: string }
export interface Group { slug: string; title: string; summary: string }

export const GROUPS: Group[] = [
  { slug: 'instalatii', title: 'Instalații', summary: 'Instalații sanitare, termice, electrice și de climatizare pentru clădiri.' },
  { slug: 'finisaje', title: 'Finisaje și tâmplărie', summary: 'Lucrări de finisare interioară și exterioară, tâmplărie și dulgherie.' },
  { slug: 'structura-cladiri', title: 'Structură și clădiri', summary: 'Construcția clădirilor, acoperișuri, demolări și dezvoltare imobiliară.' },
  { slug: 'terasamente-infrastructura', title: 'Terasamente și infrastructură', summary: 'Pregătirea terenului, drumuri, rețele și alte lucrări de infrastructură.' },
  { slug: 'lucrari-speciale', title: 'Lucrări speciale', summary: 'Lucrări specializate de construcții care nu se încadrează în celelalte categorii.' },
]

export const CATEGORIES: Category[] = [
  { slug: 'instalatii-sanitare', title: 'Instalații sanitare', group: 'instalatii', summary: 'Montaj și reparații de instalații de apă, canalizare și obiecte sanitare.' },
  { slug: 'instalatii-termice', title: 'Instalații termice', group: 'instalatii', summary: 'Instalații de încălzire: centrale, radiatoare, încălzire în pardoseală.' },
  { slug: 'climatizare', title: 'Climatizare și ventilație', group: 'instalatii', summary: 'Montaj și service pentru aer condiționat și sisteme de ventilație.' },
  { slug: 'instalatii-electrice', title: 'Instalații electrice', group: 'instalatii', summary: 'Instalații electrice pentru locuințe, spații comerciale și industriale.' },
  { slug: 'alte-instalatii', title: 'Alte instalații pentru construcții', group: 'instalatii', summary: 'Instalații speciale pentru clădiri, altele decât cele sanitare, termice și electrice.' },
  { slug: 'zugraveli-vopsitorie', title: 'Zugrăveli și vopsitorie', group: 'finisaje', summary: 'Zugrăveli, vopsitorii și finisaje de suprafață pentru pereți și tavane.' },
  { slug: 'geamuri', title: 'Geamuri și vitraje', group: 'finisaje', summary: 'Montaj de geamuri și vitraje.' },
  { slug: 'pardoseli-placari', title: 'Pardoseli și placări', group: 'finisaje', summary: 'Montaj de pardoseli, gresie, faianță și alte placări.' },
  { slug: 'ipsoserie-gips-carton', title: 'Ipsoserie și gips-carton', group: 'finisaje', summary: 'Pereți și tavane din gips-carton, ipsoserie și tencuieli.' },
  { slug: 'tamplarie-dulgherie', title: 'Tâmplărie și dulgherie', group: 'finisaje', summary: 'Tâmplărie, structuri din lemn și lucrări de dulgherie.' },
  { slug: 'alte-finisaje', title: 'Alte finisaje', group: 'finisaje', summary: 'Alte lucrări de finisare pentru clădiri.' },
  { slug: 'constructii-cladiri', title: 'Construcții de clădiri', group: 'structura-cladiri', summary: 'Construcția de locuințe și clădiri rezidențiale, comerciale sau industriale.' },
  { slug: 'acoperisuri', title: 'Acoperișuri și învelitori', group: 'structura-cladiri', summary: 'Montaj și reparații de șarpante, acoperișuri și învelitori.' },
  { slug: 'demolari', title: 'Demolări', group: 'structura-cladiri', summary: 'Demolarea construcțiilor și evacuarea materialelor rezultate.' },
  { slug: 'dezvoltare-imobiliara', title: 'Dezvoltare imobiliară', group: 'structura-cladiri', summary: 'Dezvoltarea de proiecte imobiliare: de la teren la clădiri finalizate.' },
  { slug: 'pregatirea-terenului', title: 'Pregătirea terenului și săpături', group: 'terasamente-infrastructura', summary: 'Săpături, nivelări și pregătirea terenului pentru construcții.' },
  { slug: 'foraj-sondaj', title: 'Foraj și sondaj', group: 'terasamente-infrastructura', summary: 'Foraje și sondaje pentru construcții și studii de teren.' },
  { slug: 'drumuri', title: 'Drumuri și autostrăzi', group: 'terasamente-infrastructura', summary: 'Construcția și întreținerea drumurilor și autostrăzilor.' },
  { slug: 'poduri-tuneluri', title: 'Poduri și tuneluri', group: 'terasamente-infrastructura', summary: 'Construcția de poduri, viaducte și tuneluri.' },
  { slug: 'cai-ferate', title: 'Căi ferate', group: 'terasamente-infrastructura', summary: 'Construcția și întreținerea căilor ferate.' },
  { slug: 'retele-utilitare', title: 'Rețele utilitare (fluide)', group: 'terasamente-infrastructura', summary: 'Rețele de apă, canalizare, gaze și alte fluide.' },
  { slug: 'retele-electrice-telecom', title: 'Rețele electrice și telecom', group: 'terasamente-infrastructura', summary: 'Rețele electrice și de telecomunicații.' },
  { slug: 'constructii-hidrotehnice', title: 'Construcții hidrotehnice', group: 'terasamente-infrastructura', summary: 'Lucrări hidrotehnice: diguri, canale, baraje și alte amenajări pe ape.' },
  { slug: 'alte-constructii-civile', title: 'Alte construcții civile', group: 'terasamente-infrastructura', summary: 'Alte lucrări de inginerie civilă.' },
  { slug: 'alte-lucrari-speciale', title: 'Alte lucrări speciale de construcții', group: 'lucrari-speciale', summary: 'Lucrări specializate de construcții, în afara categoriilor de mai sus.' },
]

/** Speciality labels stored on the imported firms (CAEN-derived) → category slugs. */
export const SPECIALIZARE_MAP: Record<string, string[]> = {
  'Instalații sanitare, termice, climatizare': ['instalatii-sanitare', 'instalatii-termice', 'climatizare'],
  'Instalații electrice': ['instalatii-electrice'],
  'Alte lucrări speciale de construcții': ['alte-lucrari-speciale'],
  'Tâmplărie și dulgherie': ['tamplarie-dulgherie'],
  'Pregătirea terenului / săpături': ['pregatirea-terenului'],
  'Pardoseli și placări': ['pardoseli-placari'],
  'Zugrăveli, vopsitorie, geamuri': ['zugraveli-vopsitorie', 'geamuri'],
  'Alte instalații pentru construcții': ['alte-instalatii'],
  'Acoperișuri și învelitori': ['acoperisuri'],
  'Alte finisaje': ['alte-finisaje'],
  'Construcții clădiri': ['constructii-cladiri'],
  'Demolări': ['demolari'],
  'Ipsoserie / gips-carton': ['ipsoserie-gips-carton'],
  'Foraj și sondaj': ['foraj-sondaj'],
  'Dezvoltare imobiliară': ['dezvoltare-imobiliara'],
  'Drumuri și autostrăzi': ['drumuri'],
  'Alte construcții civile': ['alte-constructii-civile'],
  'Rețele utilitare (fluide)': ['retele-utilitare'],
  'Construcții hidrotehnice': ['constructii-hidrotehnice'],
  'Rețele electrice și telecom': ['retele-electrice-telecom'],
  'Poduri și tuneluri': ['poduri-tuneluri'],
  'Căi ferate': ['cai-ferate'],
}

const SLUGS = new Set([...GROUPS.map((g) => g.slug), ...CATEGORIES.map((c) => c.slug)])
export const isCategorySlug = (s: string) => CATEGORIES.some((c) => c.slug === s)

/** Category slugs for a stored speciality; empty when the label is unknown. */
export function categoriesFor(specializare: unknown): string[] {
  return SPECIALIZARE_MAP[String(specializare ?? '').trim()] ?? []
}

/** Structural checks used by the tests: unique slugs, known groups, known targets. */
export function taxonomyProblems(): string[] {
  const p: string[] = []
  const seen = new Set<string>()
  for (const s of [...GROUPS.map((g) => g.slug), ...CATEGORIES.map((c) => c.slug)]) { if (seen.has(s)) p.push(`slug duplicat: ${s}`); seen.add(s) }
  for (const c of CATEGORIES) if (!GROUPS.some((g) => g.slug === c.group)) p.push(`grup necunoscut la ${c.slug}: ${c.group}`)
  for (const [k, v] of Object.entries(SPECIALIZARE_MAP)) for (const s of v) if (!isCategorySlug(s)) p.push(`„${k}” trimite la o categorie inexistentă: ${s}`)
  for (const c of CATEGORIES) if (!Object.values(SPECIALIZARE_MAP).some((v) => v.includes(c.slug))) p.push(`categorie fără specializare sursă: ${c.slug}`)
  if (!SLUGS.size) p.push('taxonomie goală')
  return p
}

/** Category slugs → titles, for pages that show a firm's services. Unknown slugs are dropped. */
export function categoryTitles(slugs: unknown, categories: { slug: string; title: string }[] = CATEGORIES): { slug: string; title: string }[] {
  const list = Array.isArray(slugs) ? slugs.map(String) : []
  return list.map((s) => categories.find((c) => c.slug === s)).filter((c): c is { slug: string; title: string } => !!c).map((c) => ({ slug: c.slug, title: c.title }))
}
