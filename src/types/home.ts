export type ComplianceStatus = 'compliant' | 'expiring' | 'expired' | 'pending'

export interface LegacyHomeStatisticsResponse {
  quantidade_unidades: number
  quantidade_colaboradores: number
  quantidade_requisitos: number
  quantidade_conformes: number
  quantidade_proximos_vencimento: number
  quantidade_vencidos: number
  quantidade_pendentes: number
  percentual_conformidade_geral: number
  data_referencia: string
}

export interface LegacyHomeResponse {
  nome_usuario: string
  profilePhotoUrl?: string | null
  estatisticas: LegacyHomeStatisticsResponse
}

export interface HomeStatisticsResponse {
  unitCount: number
  collaboratorCount: number
  requirementCount: number
  compliantCount: number
  expiringSoonCount: number
  expiredCount: number
  pendingCount: number
  overallCompliancePercentage: number
  referenceDate: string
}

export interface HomeResponse {
  userName: string
  statistics: HomeStatisticsResponse
  profilePhotoUrl?: string | null
}

export interface WorkspaceHome {
  userName: string
  profilePhotoUrl: string | null
  referenceDate: string
  complianceOverview: ComplianceOverview
  summaryStats: SummaryStat[]
}

export interface ComplianceSlice {
  status: ComplianceStatus
  label: string
  percentage: number
}

export interface ComplianceOverview {
  overallPercentage: number
  totalRequirements: number
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
