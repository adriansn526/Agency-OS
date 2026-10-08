/**
 * Default Romanian category tree + rules mapping supplier groups (and, for generic
 * OE groups, product descriptions) to categories. Admins can override per group
 * in the ERP (CommerceGroupMap.categoryId); rules only fill unmapped groups.
 */

export type BulkyClass = 'small' | 'standard' | 'large' | 'xlarge'

export interface CategoryDef {
  slug: string
  nameRo: string
  parent?: string
  bulky?: BulkyClass
}

export const CATEGORY_TREE: CategoryDef[] = [
  // Top-level
  { slug: 'caroserie', nameRo: 'Caroserie' },
  { slug: 'oglinzi', nameRo: 'Oglinzi' },
  { slug: 'iluminat', nameRo: 'Iluminat' },
  { slug: 'racire-motor', nameRo: 'Răcire motor & climatizare' },
  { slug: 'mecanisme-electrice', nameRo: 'Mecanisme & electrice' },
  { slug: 'motor-diverse', nameRo: 'Motor & diverse' },
  { slug: 'accesorii', nameRo: 'Accesorii auto' },

  // Caroserie
  { slug: 'bare-fata', nameRo: 'Bări față', parent: 'caroserie', bulky: 'xlarge' },
  { slug: 'bare-spate', nameRo: 'Bări spate', parent: 'caroserie', bulky: 'xlarge' },
  { slug: 'grile-ornamente-bara', nameRo: 'Grile & ornamente bară', parent: 'caroserie', bulky: 'small' },
  { slug: 'suporti-bara', nameRo: 'Suporți & absorbanți bară', parent: 'caroserie', bulky: 'small' },
  { slug: 'armaturi-bara', nameRo: 'Armături bară', parent: 'caroserie', bulky: 'large' },
  { slug: 'aripi', nameRo: 'Aripi', parent: 'caroserie', bulky: 'large' },
  { slug: 'capote', nameRo: 'Capote motor', parent: 'caroserie', bulky: 'xlarge' },
  { slug: 'usi-haioane', nameRo: 'Uși, haioane & capote portbagaj', parent: 'caroserie', bulky: 'xlarge' },
  { slug: 'trager-panouri', nameRo: 'Trager, panouri & praguri', parent: 'caroserie', bulky: 'large' },
  { slug: 'aparatori-noroi', nameRo: 'Carenaje roată & apărători noroi', parent: 'caroserie', bulky: 'standard' },
  { slug: 'ornamente-caroserie', nameRo: 'Ornamente & bandouri caroserie', parent: 'caroserie', bulky: 'standard' },
  { slug: 'grile-radiator', nameRo: 'Grile radiator', parent: 'caroserie', bulky: 'standard' },
  { slug: 'spoilere-tuning', nameRo: 'Spoilere & tuning', parent: 'caroserie', bulky: 'large' },
  { slug: 'scuturi-protectii', nameRo: 'Scuturi & protecții plastic', parent: 'caroserie', bulky: 'standard' },

  // Oglinzi
  { slug: 'oglinzi-complete', nameRo: 'Oglinzi complete', parent: 'oglinzi', bulky: 'standard' },
  { slug: 'sticle-oglinda', nameRo: 'Sticle oglindă', parent: 'oglinzi', bulky: 'small' },
  { slug: 'capace-oglinda', nameRo: 'Capace oglindă', parent: 'oglinzi', bulky: 'small' },
  { slug: 'semnalizari-oglinda', nameRo: 'Semnalizări & lămpi oglindă', parent: 'oglinzi', bulky: 'small' },

  // Iluminat
  { slug: 'faruri', nameRo: 'Faruri', parent: 'iluminat', bulky: 'standard' },
  { slug: 'stopuri', nameRo: 'Stopuri', parent: 'iluminat', bulky: 'standard' },
  { slug: 'proiectoare', nameRo: 'Proiectoare & lumini de zi', parent: 'iluminat', bulky: 'small' },
  { slug: 'semnalizari-lampi', nameRo: 'Semnalizări & lămpi', parent: 'iluminat', bulky: 'small' },
  { slug: 'becuri-socluri', nameRo: 'Becuri & socluri', parent: 'iluminat', bulky: 'small' },

  // Răcire
  { slug: 'radiatoare-apa', nameRo: 'Radiatoare apă', parent: 'racire-motor', bulky: 'large' },
  { slug: 'intercoolere', nameRo: 'Intercoolere', parent: 'racire-motor', bulky: 'large' },
  { slug: 'condensatoare-ac', nameRo: 'Condensatoare AC', parent: 'racire-motor', bulky: 'large' },
  { slug: 'radiatoare-incalzire', nameRo: 'Radiatoare încălzire', parent: 'racire-motor', bulky: 'standard' },
  { slug: 'electroventilatoare', nameRo: 'Electroventilatoare', parent: 'racire-motor', bulky: 'large' },
  { slug: 'vase-expansiune', nameRo: 'Vase expansiune & bușoane', parent: 'racire-motor', bulky: 'standard' },
  { slug: 'suporti-radiator', nameRo: 'Suporți radiator', parent: 'racire-motor', bulky: 'small' },

  // Mecanisme & electrice
  { slug: 'macarale-geam', nameRo: 'Macarale geam', parent: 'mecanisme-electrice', bulky: 'standard' },
  { slug: 'manere-usi', nameRo: 'Mânere uși', parent: 'mecanisme-electrice', bulky: 'small' },
  { slug: 'incuietori-yale', nameRo: 'Încuietori, yale & actuatoare', parent: 'mecanisme-electrice', bulky: 'small' },
  { slug: 'balamale-limitatoare', nameRo: 'Balamale & limitatoare uși', parent: 'mecanisme-electrice', bulky: 'small' },
  { slug: 'amortizoare-haion', nameRo: 'Amortizoare haion & capotă', parent: 'mecanisme-electrice', bulky: 'small' },
  { slug: 'butoane-comutatoare', nameRo: 'Butoane & comutatoare', parent: 'mecanisme-electrice', bulky: 'small' },
  { slug: 'senzori', nameRo: 'Senzori parcare & presiune', parent: 'mecanisme-electrice', bulky: 'small' },
  { slug: 'spalare-stergere', nameRo: 'Vase & pompe spălare parbriz', parent: 'mecanisme-electrice', bulky: 'standard' },

  // Motor & diverse
  { slug: 'carcase-filtru-aer', nameRo: 'Carcase filtru aer', parent: 'motor-diverse', bulky: 'standard' },
  { slug: 'suporti-motor', nameRo: 'Suporți motor & punte', parent: 'motor-diverse', bulky: 'standard' },
  { slug: 'diverse', nameRo: 'Diverse', parent: 'motor-diverse', bulky: 'standard' },

  // Accesorii
  { slug: 'accesorii-siguranta', nameRo: 'Accesorii siguranță & iarnă', parent: 'accesorii', bulky: 'small' },
]

interface Rule {
  cat: string
  group?: RegExp
  desc?: RegExp
}

// Order matters — first match wins.
const RULES: Rule[] = [
  // Mirrors
  { cat: 'sticle-oglinda', group: /MIRROR GLASS/ },
  { cat: 'capace-oglinda', group: /MIRROR COVER/ },
  { cat: 'semnalizari-oglinda', group: /MIRROR LAMPS/ },
  { cat: 'butoane-comutatoare', group: /MIRROR SWITCH|SWITCH/ },
  { cat: 'oglinzi-complete', group: /DOOR MIRROR/ },
  // Lighting
  { cat: 'becuri-socluri', group: /BULB|XENON/ },
  { cat: 'faruri', group: /HEAD LAMP/ },
  { cat: 'stopuri', group: /TAIL LAMP/ },
  { cat: 'proiectoare', group: /FOG LAMP|DAYLIGHT/ },
  { cat: 'semnalizari-lampi', group: /LAMPS|VISTEON/ },
  // Cooling
  { cat: 'intercoolere', group: /INTERCOOLER/ },
  { cat: 'radiatoare-incalzire', group: /HEATER RADIATOR/ },
  { cat: 'condensatoare-ac', group: /CONDENSER/ },
  { cat: 'suporti-radiator', group: /RADIATOR BRACKET/ },
  { cat: 'radiatoare-apa', group: /RADIATOR/ },
  { cat: 'electroventilatoare', group: /COOLING FAN/ },
  { cat: 'vase-expansiune', group: /AUXILIARY TANK/ },
  // Mechanisms
  { cat: 'macarale-geam', group: /WINDOW REGULATOR/ },
  { cat: 'manere-usi', group: /DOOR HANDLE/ },
  { cat: 'incuietori-yale', group: /LOCK|KEY CYLINDER|ACTUATOR/ },
  { cat: 'balamale-limitatoare', group: /DOOR CHECK|HINGE|ROLLER GUIDE/ },
  { cat: 'amortizoare-haion', group: /GAS SPRING/ },
  { cat: 'senzori', group: /PDC|SENSOR$|PRESURE SENSOR|PRESSURE SENSOR/ },
  { cat: 'spalare-stergere', group: /WIPER|WATER TANK/ },
  // Body
  { cat: 'bare-fata', group: /^FRONT BUMPERS?$/ },
  { cat: 'bare-spate', group: /^REAR BUMPERS?$/ },
  { cat: 'armaturi-bara', group: /REINFORCEMENT|STIFFENER/ },
  { cat: 'suporti-bara', group: /BUMPER.*BRACKET|BRACKETS-ABSORBERS|ABSORBER|BUMPER SENSOR BRACKET/ },
  { cat: 'grile-ornamente-bara', group: /BUMPER GRILLE|BUMPER MOULDING|BUMPER ENDS|COVERS BUMPER|TOW HOOK/ },
  { cat: 'spoilere-tuning', group: /SPOILER|TUNING/ },
  { cat: 'grile-radiator', group: /^GRILLES?\b|GRILLE NETS/ },
  { cat: 'ornamente-caroserie', group: /FLARES|MOULDING|EMPLEM|EMBLEM/ },
  { cat: 'trager-panouri', group: /PANELS-INNER/ },
  { cat: 'aparatori-noroi', group: /INNER FENDER|MUD FLAP/ },
  { cat: 'aripi', group: /FENDERS$|FENDER BRACKETS/ },
  { cat: 'capote', group: /^HOOD$/ },
  { cat: 'usi-haioane', group: /^DOOR |TAIL GATE$|TRUNK LID|TAIL BODY/ },
  { cat: 'trager-panouri', group: /PANEL|SIDE FRAMES|SILLS|APRON/ },
  { cat: 'scuturi-protectii', group: /UNDERBODY|ENGINE COVER|EGINE COVER|SPLASH GUARD|COVER PANELS|HOOD INSULATOR|PLASTIC PARTS|AIRDUCT|INTERIOR COVER|WHEEL COVER|INSTALATION KIT/ },
  // Engine & misc
  { cat: 'carcase-filtru-aer', group: /AIR FILTER/ },
  { cat: 'suporti-motor', group: /ENGINE MOUNT|REAR AXLE/ },
  { cat: 'accesorii-siguranta', group: /TOOLS|EXTINGUISHER|SNOW|SAFETY|LICENCE PLATE|ISOFIX|SHADER/i },
]

// Description rules — used for generic OE groups ("ORIGINAL HYUNDAI KAT 27", "1802 - GROUP FIAT KAT 28")
const DESC_RULES: Rule[] = [
  { cat: 'sticle-oglinda', desc: /MIRROR GLASS/ },
  { cat: 'capace-oglinda', desc: /MIRROR COVER/ },
  { cat: 'oglinzi-complete', desc: /DOOR MIRROR/ },
  { cat: 'faruri', desc: /HEAD ?LAMP/ },
  { cat: 'stopuri', desc: /TAIL ?LAMP/ },
  { cat: 'proiectoare', desc: /FOG ?LAMP|DAYLIGHT|DRL/ },
  { cat: 'semnalizari-lampi', desc: /LAMP|REFLECTOR/ },
  { cat: 'intercoolere', desc: /INTERCOOLER/ },
  { cat: 'condensatoare-ac', desc: /CONDENSER/ },
  { cat: 'radiatoare-apa', desc: /RADIATOR/ },
  { cat: 'electroventilatoare', desc: /COOLING FAN|FAN/ },
  { cat: 'armaturi-bara', desc: /BUMPER REINFORCEMENT/ },
  { cat: 'suporti-bara', desc: /BUMPER.*BRACKET|ABSORBER/ },
  { cat: 'grile-ornamente-bara', desc: /BUMPER (GRILLE|MOULDING|COVER)|TOW HOOK/ },
  { cat: 'bare-fata', desc: /FRONT BUMPER/ },
  { cat: 'bare-spate', desc: /REAR BUMPER/ },
  { cat: 'grile-radiator', desc: /\bGRILLE\b/ },
  { cat: 'aparatori-noroi', desc: /INNER (PLASTIC )?FENDER|MUD FLAP/ },
  { cat: 'aripi', desc: /\bFENDER\b/ },
  { cat: 'capote', desc: /^HOOD\b/ },
  { cat: 'macarale-geam', desc: /WINDOW REGULATOR/ },
  { cat: 'manere-usi', desc: /HANDLE/ },
  { cat: 'incuietori-yale', desc: /\bLOCK\b/ },
  { cat: 'amortizoare-haion', desc: /GAS SPRING/ },
  { cat: 'senzori', desc: /SENSOR/ },
  { cat: 'spoilere-tuning', desc: /SPOILER/ },
  { cat: 'ornamente-caroserie', desc: /MOULDING|EMBLEM|BADGE/ },
  { cat: 'trager-panouri', desc: /PANEL|SILL/ },
  { cat: 'usi-haioane', desc: /\bDOOR\b|TAIL ?GATE|TRUNK/ },
]

const GENERIC_GROUP = /ORIGINAL|GROUP .* KAT|^VARIOUS$|^MISC|BUMPERS FRONT - REAR/

export function categoryForGroup(group: string): string | null {
  const g = group.toUpperCase().trim()
  if (GENERIC_GROUP.test(g)) return null // needs per-product description rules
  for (const r of RULES) if (r.group && r.group.test(g)) return r.cat
  return 'diverse'
}

export function categoryForDescription(descEn: string): string {
  const d = descEn.toUpperCase()
  for (const r of DESC_RULES) if (r.desc && r.desc.test(d)) return r.cat
  return 'diverse'
}

export function bulkyClassFor(slug: string): BulkyClass {
  return CATEGORY_TREE.find((c) => c.slug === slug)?.bulky ?? 'standard'
}
