import CompactPurpleButton from '../compactPurpleButton'
import SummaryStatCard from '../summaryStatCard'

function HomeDashboardSkeleton({ onViewDashboards }: { onViewDashboards?: () => void }) {
  return <>
    <p className="sr-only" role="status">Carregando os indicadores do workspace.</p>
    <div className="home-dashboards home-dashboards--loading">
      <div className="home-card compliance-overview">
        <div className="compliance-overview-header">
          <div>
            <h3>Visão geral de conformidade</h3>
            <p>Status de requisitos e treinamentos de toda empresa</p>
          </div>
          <CompactPurpleButton className="compliance-overview-action" disabled={!onViewDashboards} onClick={onViewDashboards}>Ver dashboards</CompactPurpleButton>
        </div>
        <div aria-hidden="true" className="compliance-overview-body">
          <div className="compliance-donut home-skeleton-donut">
            <div className="compliance-donut-center">
              <strong className="home-skeleton home-skeleton-number" />
              <span className="home-skeleton home-skeleton-center-label" />
            </div>
          </div>
          <ul className="compliance-legend">
            {['compliant', 'expiring', 'expired', 'pending'].map(status => <li key={status}>
              <span className="home-skeleton compliance-legend-dot" />
              <span className="home-skeleton home-skeleton-label" />
            </li>)}
          </ul>
        </div>
      </div>
      <div className="home-summary">
        <SummaryStatCard loading stat={{ id: 'units', label: 'Unidades', value: 0, icon: 'building', path: '/mainUnitScreen' }} />
        <SummaryStatCard loading stat={{ id: 'collaborators', label: 'Colaboradores', value: 0, icon: 'collaborators', path: '/mainEmployeerScreen' }} />
      </div>
    </div>
  </>
}

export default HomeDashboardSkeleton
