import ComplianceOverviewCard from '../complianceOverviewCard'
import SummaryStatCard from '../summaryStatCard'
import type { WorkspaceHome, SummaryStat } from '../../types/home'

interface HomeDashboardSkeletonProps {
  onViewDashboards?: () => void
  data?: WorkspaceHome | null
  loading?: boolean
}

const pendingStats: SummaryStat[] = [
  { id: 'units', label: 'Unidades', value: 0, icon: 'building', path: '/mainUnitScreen' },
  { id: 'collaborators', label: 'Colaboradores', value: 0, icon: 'collaborators', path: '/mainEmployeerScreen' },
]

function HomeDashboardSkeleton({ onViewDashboards, data, loading = true }: HomeDashboardSkeletonProps) {
  return <>
    {loading && <p className="sr-only" role="status">Carregando os indicadores do workspace.</p>}
    <div className="home-dashboards">
      <ComplianceOverviewCard loading={loading} overview={data?.complianceOverview} onViewDashboards={onViewDashboards} />
      <div className="home-summary">
        {(data?.summaryStats ?? pendingStats).map(stat => <SummaryStatCard key={stat.id} loading={loading} stat={stat} />)}
      </div>
    </div>
  </>
}

export default HomeDashboardSkeleton
