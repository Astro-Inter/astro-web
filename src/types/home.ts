export type ComplianceStatus = 'compliant' | 'expiring' | 'expired'

export interface ComplianceSlice {
  status: ComplianceStatus
  label: string
  percentage: number
}

export interface ComplianceOverview {
  overallPercentage: number
  slices: ComplianceSlice[]
}

export interface SummaryStat {
  id: string
  label: string
  value: number
  icon: 'building' | 'collaborators'
  path?: string
}

export type QuickActionColor = 'pink' | 'green' | 'blue'

export interface QuickAction {
  id: string
  title: string
  description: string
  actionLabel: string
  icon: 'person-plus' | 'document-lines' | 'event-calendar'
  color: QuickActionColor
  path?: string
}
