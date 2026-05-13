// ============================================================
// ASNS Agency OS — Company Settings
// ============================================================

import type { CompanySettings, ContractSettings } from './types'

export const companySettings: CompanySettings = {
  name: 'ASNS',
  legalName: 'ADVANCED SYSTEMS & NETWORK SOLUTIONS SRL',
  regCom: 'J40/12223/2006',
  cif: 'RO18890424',
  address: 'Sos. Berceni, Nr.39, Bl.107, Sc.2, Et.7, Ap.100, Sector 4, Jud. București',
  iban: 'RO59BTRLRONCRT0549484001',
  bank: 'BANCA TRANSILVANIA',
  representative: 'Administrator',
  representativeRole: 'Administrator',
  email: 'office@asns.ro',
  phone: '+40 XXX XXX XXX',
  website: 'https://asns.ro',
}

export const contractSettings: ContractSettings = {
  defaultDuration: 12,        // 12 luni
  defaultCurrency: 'EUR',
  penaltyRate: 0.1,           // 0.1%/zi
  noticePeriod: 30,           // 30 zile preaviz
  autoRenew: true,            // reconducere tacită
  paymentTermDays: 5,         // 5 zile de la emitere factură
  numbering: {
    agency: { prefix: 'ASNS-AG', nextNumber: 1, year: 2026 },
    fudly:  { prefix: 'ASNS-FD', nextNumber: 1, year: 2026 },
    climaticpro: { prefix: 'ASNS-CP', nextNumber: 1, year: 2026 },
  },
}
