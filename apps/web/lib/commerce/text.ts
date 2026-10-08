/**
 * Text helpers for the commerce module (slugs, casing, OE normalization).
 */

const DIACRITICS: Record<string, string> = {
  ă: 'a', â: 'a', î: 'i', ș: 's', ş: 's', ț: 't', ţ: 't',
  Ă: 'a', Â: 'a', Î: 'i', Ș: 's', Ş: 's', Ț: 't', Ţ: 't',
}

export function slugify(input: string): string {
  return input
    .replace(/[ăâîșşțţĂÂÎȘŞȚŢ]/g, (c) => DIACRITICS[c] ?? c)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 120)
}

// Keep known acronyms / alphanumeric codes upper-case
const KEEP_UPPER = /^(?:[A-Z]{1,3}\d*|\d+[A-Z]*|[A-Z]+\d+[A-Z\d]*|I{1,3}|IV|VI{0,3}|IX|XI{0,2}|BMW|VW|MG|DS|GT|GTI|SUV|MCV|BYD|GAC|KGM|SDN|AMG|RS|TDI|CNG|LPG|EV|PHEV|HEV)$/

export function titleCase(input: string): string {
  return input
    .split(/(\s+|-|\/)/)
    .map((part) => {
      if (!part.trim() || part === '-' || part === '/') return part
      if (KEEP_UPPER.test(part)) return part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join('')
}

/** OE codes are compared without separators/spaces, upper-case. */
export function normalizeOe(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function parseDecimalComma(v: string): number {
  const n = Number(v.trim().replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}
