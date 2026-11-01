import type { ReactNode } from 'react'
import type { CompanyInformation } from './company'
import type { WorkspaceUnitAddress } from './address'

export interface WorkspaceRegistrationData {
  email: string
  password: string
  workspace: CompanyInformation
  units: {
    name: string
    cep: string
    state: string
    city: string
    neighborhood: string
    street: string
    number: string
    addressLine2?: string
  }[]
}

export interface WorkspaceRegistrationDraft {
  email: string
  password: string
  company: CompanyInformation
  units: WorkspaceUnitAddress[]
  file: File | null
}

export interface SpreadsheetImportError {
  row: number
  field: string
  message: string
}

export interface RegistrationSpreadsheetAnalysis {
  names: string[]
  emails: { row: number; email: string }[]
}

export interface WorkspaceRegistrationResult {
  workspaceId: number
  importErrors: SpreadsheetImportError[]
}

export type WorkspaceRegistrationStatus = 'idle' | 'loading' | 'success' | 'error'

export interface WorkspaceEmailVerificationState {
  status: WorkspaceRegistrationStatus
  message: string
}

export interface WorkspaceRegistrationContextValue {
  draft: WorkspaceRegistrationDraft
  verifiedEmail: string
  markEmailVerified: (email: string) => void
  status: WorkspaceRegistrationStatus
  error: string
  failureStatus: number
  importErrors: SpreadsheetImportError[]
  result: WorkspaceRegistrationResult | null
  updateDraft: (changes: Partial<WorkspaceRegistrationDraft>) => void
  submit: () => Promise<boolean>
  reset: () => void
}

export interface WorkspaceRegistrationProviderProps {
  children: ReactNode
}
