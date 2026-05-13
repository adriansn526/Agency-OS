// ─── Settings Store ───
// File-based settings storage (since no Settings table exists in Prisma schema)
// Stores company settings and contract settings as JSON
// In production, migrate to a DB table; for now, JSON file is sufficient.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

// Settings file location (persisted in data dir)
const SETTINGS_DIR = join(process.cwd(), '.data')
const SETTINGS_FILE = join(SETTINGS_DIR, 'settings.json')

// ─── Default settings (from mock data) ───
export interface CompanySettingsData {
  name: string
  legalName: string
  regCom: string
  cif: string
  address: string
  iban: string
  bank: string
  representative: string
  representativeRole: string
  email: string
  phone: string
  website: string
  logo?: string
}

export interface ContractNumberingConfig {
  prefix: string
  nextNumber: number
  year: number
}

export interface ContractSettingsData {
  defaultDuration: number
  defaultCurrency: string
  penaltyRate: number
  noticePeriod: number
  autoRenew: boolean
  paymentTermDays: number
  numbering: Record<string, ContractNumberingConfig>
}

export interface IntegrationSettings {
  smso?: {
    apiKey: string
    sender?: string  // custom sender ID
    enabled: boolean
  }
  ai?: {
    provider: 'openai' | 'gemini'
    apiKey: string
    model?: string
    enabled: boolean
  }
}

export interface AllSettings {
  company: CompanySettingsData
  contracts: ContractSettingsData
  integrations: IntegrationSettings
}

const DEFAULT_SETTINGS: AllSettings = {
  company: {
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
  },
  contracts: {
    defaultDuration: 12,
    defaultCurrency: 'EUR',
    penaltyRate: 0.1,
    noticePeriod: 30,
    autoRenew: true,
    paymentTermDays: 5,
    numbering: {
      agency: { prefix: 'ASNS-AG', nextNumber: 1, year: 2026 },
      fudly: { prefix: 'ASNS-FD', nextNumber: 1, year: 2026 },
      climaticpro: { prefix: 'ASNS-CP', nextNumber: 1, year: 2026 },
    },
  },
  integrations: {},
}

export function readSettings(): AllSettings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, 'utf-8')
      const parsed = JSON.parse(raw) as AllSettings
      // Merge with defaults to fill in any missing fields
      return {
        company: { ...DEFAULT_SETTINGS.company, ...parsed.company },
        contracts: {
          ...DEFAULT_SETTINGS.contracts,
          ...parsed.contracts,
          numbering: {
            ...DEFAULT_SETTINGS.contracts.numbering,
            ...(parsed.contracts?.numbering || {}),
          },
        },
        integrations: { ...DEFAULT_SETTINGS.integrations, ...parsed.integrations },
      }
    }
  } catch (error) {
    console.warn('[Settings] Error reading settings file, using defaults:', error)
  }
  return { ...DEFAULT_SETTINGS }
}

export function writeSettings(settings: AllSettings): void {
  try {
    if (!existsSync(SETTINGS_DIR)) {
      mkdirSync(SETTINGS_DIR, { recursive: true })
    }
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
  } catch (error) {
    console.error('[Settings] Error writing settings file:', error)
    throw error
  }
}
