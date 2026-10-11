/** Shared (server + client) labels for orders and partner jobs. No imports from the database layer on purpose. */
export const ORDER_STATUSES = [
  { key: 'pending_confirmation', label: 'De confirmat', lead: 'nou' },
  { key: 'confirmed', label: 'Confirmată', lead: 'comanda' },
  { key: 'ordered_supplier', label: 'Piesă comandată la furnizor', lead: 'comanda' },
  { key: 'at_partner', label: 'Piesă la service', lead: 'comanda' },
  { key: 'job_scheduled', label: 'Lucrare programată', lead: 'comanda' },
  { key: 'ready', label: 'Gata de ridicat', lead: 'comanda' },
  { key: 'shipped', label: 'Expediată', lead: 'comanda' },
  { key: 'delivered', label: 'Livrată / predată', lead: 'livrat' },
  { key: 'cancelled', label: 'Anulată', lead: null },
  { key: 'returned', label: 'Returnată', lead: null },
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]['key']

export const JOB_LABEL: Record<string, string> = { pending: 'de programat', scheduled: 'programată', done: 'finalizată', settled: 'decontată', cancelled: 'anulată' }
export const SERVICE_LABEL_RO: Record<string, string> = { mount: 'Montaj', paint: 'Vopsire', paint_mount: 'Vopsire + montaj' }
