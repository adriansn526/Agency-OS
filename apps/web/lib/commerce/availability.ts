/**
 * Public availability of a product, derived from the supplier's per-warehouse flags (CommerceStock.rawFlag).
 *
 * The supplier never discloses quantities, only 1 (available) / 0 (not available) per warehouse, so:
 *   supplier_confirm  any warehouse 1 → confirm_on_order (supplier stock, confirmed by phone); all 0 → out_of_stock;
 *                     no flags known → confirm_on_order. `in_stock` is reserved for own stock (none exists yet).
 *   one_in_stock / one_out_of_stock   legacy meanings
 *   anything else ("unknown")         confirm_on_order
 */
export type Availability = 'in_stock' | 'out_of_stock' | 'confirm_on_order'

export function availabilityFromFlags(flags: readonly number[], meaning: string): Availability {
  if (meaning === 'supplier_confirm') {
    if (flags.some((f) => f === 1)) return 'confirm_on_order'
    return flags.length > 0 ? 'out_of_stock' : 'confirm_on_order'
  }
  if (meaning === 'one_in_stock') return flags.some((f) => f === 1) ? 'in_stock' : 'out_of_stock'
  if (meaning === 'one_out_of_stock') return flags.some((f) => f === 0) ? 'in_stock' : 'out_of_stock'
  return 'confirm_on_order'
}
