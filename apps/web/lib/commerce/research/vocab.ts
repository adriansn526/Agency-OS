/** Shared vocabulary for the demand research scripts: search terms for parts and Romanian-style labels for vehicles. */
export const MAKES = ['VW', 'BMW', 'Renault', 'Dacia', 'Ford', 'Opel', 'Toyota', 'Skoda', 'Audi', 'Mercedes', 'Hyundai', 'Fiat']
export const MAKE_TERM: Record<string, string> = { VW: 'vw', BMW: 'bmw', Renault: 'renault', Dacia: 'dacia', Ford: 'ford', Opel: 'opel', Toyota: 'toyota', Skoda: 'skoda', Audi: 'audi', Mercedes: 'mercedes', Hyundai: 'hyundai', Fiat: 'fiat' }
/** search term -> regex on the unaccented, lower-case Romanian product name */
export const PART_RE: Record<string, string> = {
  'bara fata': '^bara fata', 'bara spate': '^bara spate', grila: '^grila', far: '^far( |$)', stop: '^stop( |$)', oglinda: '^oglinda', 'sticla oglinda': '^sticla oglinda', 'capac oglinda': '^capac oglinda',
  'aripa fata': '^aripa fata', 'aripa spate': '^aripa spate', capota: '^capota', 'maner usa': '^maner usa', 'broasca usa': '^broasca', 'amortizor haion': '^amortizor haion', proiector: '^proiector',
  'suport bara': '^suport bara', 'armatura bara': '^armatura bara', 'spoiler bara': '^spoiler bara', 'scut motor': '^scut motor', 'balama capota': '^balama capota', trager: '^trager',
  'radiator intercooler': '^radiator intercooler', 'condensator ac': '^condensator', 'vas expansiune': '^vas expansiune', 'macara geam': '^macara', 'limitator usa': '^limitator',
  'bandou aripa': '^bandou', 'carenaj aripa': '^carenaj aripa', 'pasaj roata': '^pasaj', 'amortizor capota': '^amortizor capota', 'usa fata': '^usa fata', haion: '^haion',
}
export const PARTS = Object.keys(PART_RE)
const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' }
const BODY = /\b(sdn|h\/b|l\/b|s\.w\.|[0-9]d|[0-9]\/[0-9]d|coupe\/cabrio|coupe|cabrio|estate|van|combi|bus|mpv|gt)\b/gi

export const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
export const modelLabel = (m: string) => norm(m.replace(/^series\s+/i, 'seria ').replace(/^(\w)\s+class$/i, 'clasa $1'))
export function genLabel(gen: string, modelName: string): string {
  let t = gen.replace(/\([^)]*\)/g, ' ').replace(BODY, ' ')
  t = norm(t).split(' ').map((w) => ROMAN[w] ?? w).join(' ')
  const m = modelLabel(modelName)
  return t.startsWith(m) || t.length === 0 ? (t || m) : `${m} ${t}`.trim()
}
