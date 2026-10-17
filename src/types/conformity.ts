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

export interface ConformityDetails extends Conformity {
  employeeEmail: string
  nrId: number
  nrTitle: string
  applicable: boolean
  eventCompletionId: number | null
  status: ConformityStatus
  profilePhotoUrl: string | null
  avatarInitials: string | null
}

export interface ConformityResponse {
  id: number
  collaboratorId: number
  collaboratorName: string
  collaboratorEmail: string
  nrId: number
  nrTitle: string
  expiresAt: string | null
  origin: 'MANUAL' | 'EVENTO'
  applicable: boolean
  eventCompletionId: number | null
  status: 'Vencida' | 'Válida' | 'Sem validade'
  profilePhotoUrl: string | null
  avatarInitials: string | null
}

export interface ConformityNrOption { code: number; title: string }

export interface UpdateConformityRequest { nrId: number; expiresAt: string | null }
export interface CreateConformityRequest extends UpdateConformityRequest { collaboratorId: number }

export interface ConformityImportResult {
  processed: number
  inserted: number
  updated: number
  rejected: number
  rejectedRows: { row: number; cpf: string; nr: string; reason: string }[]
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
