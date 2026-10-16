/** URL slugs for website entries (pure). Romanian diacritics fold to ASCII; uniqueness is resolved by the caller. */
export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // ă â î → a a i
    .replace(/ș|ş/g, 's').replace(/ț|ţ/g, 't')
    .replace(/&/g, ' si ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
  return s || 'intrare'
}

/** `base`, then `base-2`, `base-3`… until `isTaken` says the candidate is free. */
export async function uniqueSlug(base: string, isTaken: (candidate: string) => Promise<boolean>): Promise<string> {
  if (!(await isTaken(base))) return base
  for (let i = 2; i < 500; i++) {
    const c = `${base.slice(0, 74)}-${i}`
    if (!(await isTaken(c))) return c
  }
  return `${base.slice(0, 60)}-${Date.now().toString(36)}`
}
