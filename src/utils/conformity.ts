import type { ConformityFormValues, ConformityStatus } from '../types/conformity'

export type ConformityValidationErrors = Partial<Record<keyof ConformityFormValues, string>>

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

export function validateConformity(values: ConformityFormValues, employeeIds: readonly string[], nrs: readonly string[], dateValid: boolean): ConformityValidationErrors {
  const errors: ConformityValidationErrors = {}
  if (!employeeIds.includes(values.employeeId)) errors.employeeId = 'Selecione o colaborador.'
  if (!nrs.includes(values.nr)) errors.nr = 'Selecione a NR.'
  if (!dateValid || (values.expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(values.expiresAt))) errors.expiresAt = 'Informe uma data válida no formato dd/mm/aaaa.'
  return errors
}
