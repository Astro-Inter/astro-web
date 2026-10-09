export type ConformityOrigin = 'Evento' | 'Manual'

export type ConformityStatus = 'valid' | 'expired' | 'no-expiry'

export interface Conformity {
  id: string
  employeeId: string
  employeeName: string
  nr: string
  expiresAt: string | null
  origin: ConformityOrigin
}

export interface ConformityFilters {
  nr: string
  origin: '' | ConformityOrigin
  from: string
  to: string
}

export interface ConformityFormValues {
  employeeId: string
  nr: string
  expiresAt: string
}
