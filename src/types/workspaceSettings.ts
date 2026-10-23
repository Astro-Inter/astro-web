export type WorkspaceSettingsSection = 'company' | 'spreadsheet' | 'addresses' | 'payments'

export interface WorkspaceSettingsNavigationState {
  from?: string
  savedSection?: WorkspaceSettingsSection
}

export interface WorkspaceResponse {
  id: number
  name: string
  cnpj: string
}

export interface WorkspaceUnitRequest {
  name: string
  cep: string
  state: string
  city: string
  neighborhood: string
  street: string
  number: string
  addressLine2: string | null
}

export interface SpreadsheetImportMessage {
  row: number
  field: string
  message: string
}

export interface WorkspaceImportResult {
  created: number
  updated: number
  unchanged: number
  unitsCreated: number
  rolesCreated: number
  ignored: SpreadsheetImportMessage[]
}

export interface WorkspaceManagerTransferResult {
  workspaceId: number
  previousManagerId: number
  newManagerId: number
}
