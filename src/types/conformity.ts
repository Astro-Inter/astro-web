export type ConformityOrigin = 'Evento' | 'Manual'

export type ConformityStatus = 'valid' | 'expired' | 'no-expiry'

export interface Conformity {
  id: string
  employeeName: string
  nr: string
  expiresAt: string | null
  origin: ConformityOrigin
}
