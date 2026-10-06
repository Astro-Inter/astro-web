export type WorkspaceSettingsSection = 'company' | 'spreadsheet' | 'addresses' | 'payments'

export interface WorkspaceSettingsNavigationState {
  from?: string
  savedSection?: WorkspaceSettingsSection
}
