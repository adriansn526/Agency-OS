/**
 * Upgrades stored layouts of service and price pages to the blocks that used to be hard-coded in the public site:
 * the reassurance ticks under the hero buttons (hero.checks), the firms list (firms_list) and the request form (request_form).
 * Pure: the same rules for the migration script and the test. A page the team already arranged with these blocks is left as it is.
 */
import type { PageNode } from '../pages/blocks'
import { HERO_CHECKS } from './templates'

const has = (nodes: PageNode[], type: string): boolean => nodes.some((n) => n.type === type || Object.values(n.slots ?? {}).some((s) => has(s, type)))
const node = (id: string, type: string, props: Record<string, unknown> = {}): PageNode => ({ id, type, props })
const freeId = (nodes: PageNode[], base: string) => { const used = new Set<string>(); const walk = (xs: PageNode[]) => xs.forEach((n) => { used.add(n.id); Object.values(n.slots ?? {}).forEach(walk) }); walk(nodes); let id = base, i = 2; while (used.has(id)) id = `${base}-${i++}`; return id }

/** Returns the upgraded top-level blocks, or null when nothing changes. `kind` is the collection key ('servicii' also gets the firms list). */
export function upgradeBlocks(blocks: PageNode[], kind: 'servicii' | 'preturi'): PageNode[] | null {
  if (!blocks.length) return null
  let out = blocks.map((n) => (n.type === 'hero' && n.props.checks === undefined && typeof n.props.buttonLabel === 'string' && n.props.buttonLabel ? { ...n, props: { ...n.props, checks: HERO_CHECKS } } : n))
  let changed = out.some((n, i) => n !== blocks[i])
  const needFirms = kind === 'servicii' && !has(out, 'firms_list')
  const needForm = !has(out, 'request_form')
  if (needFirms || needForm) {
    // the old call-to-action banner is where the form goes (the form has its own heading); without one the blocks close the page
    const at = out.findIndex((n) => n.type === 'request_cta')
    const add: PageNode[] = []
    if (needFirms) add.push(node(freeId(out, 'firms'), 'firms_list', { limit: '6' }))
    if (needForm) add.push(node(freeId(out, 'form'), 'request_form'))
    out = at >= 0 && needForm ? [...out.slice(0, at), ...add, ...out.slice(at + 1)] : [...out, ...add]
    changed = true
  }
  return changed ? out : null
}
