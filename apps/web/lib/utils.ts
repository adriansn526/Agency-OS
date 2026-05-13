import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, compact = false, currency = 'EUR'): string {
  const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  if (compact) {
    if (val >= 1000) {
      return `€${(val / 1000).toFixed(1).replace('.0', '')}K`
    }
    return `€${val}`
  }
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

export function formatDate(dateString: string): string {
  if (!dateString) return '—'
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
