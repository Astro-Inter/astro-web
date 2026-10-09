import type { ConformityStatus } from '../types/conformity'

export const conformityStatusLabels: Record<ConformityStatus, string> = {
  valid: 'Válida',
  expired: 'Vencida',
  'no-expiry': 'Sem validade',
}

function toDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function getConformityStatus(expiresAt: string | null, today: Date = new Date()): ConformityStatus {
  if (!expiresAt) return 'no-expiry'
  return expiresAt < toDateKey(today) ? 'expired' : 'valid'
}

export function formatConformityDate(expiresAt: string | null): string {
  if (!expiresAt) return 'Sem validade'
  const [year, month, day] = expiresAt.split('-')
  return `${day}/${month}/${year}`
}
