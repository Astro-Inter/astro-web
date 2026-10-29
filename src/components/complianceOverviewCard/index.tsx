import { BUTTONS } from '../../gtm/buttons'
import CompactPurpleButton from '../compactPurpleButton'
import ComplianceDonutChart from '../complianceDonutChart'
import HomeLoadingContent from '../homeLoadingContent'
import type { ComplianceOverview } from '../../types/home'

interface ComplianceOverviewCardProps {
  overview?: ComplianceOverview
  loading?: boolean
  onViewDashboards?: () => void
}

function ComplianceOverviewCard({ overview, loading = false, onViewDashboards }: ComplianceOverviewCardProps) {
  return (
    <article aria-labelledby="compliance-overview-title" className="home-card compliance-overview">
      <header className="compliance-overview-header">
        <div>
          <h3 id="compliance-overview-title">Visão geral de conformidade</h3>
          <p>Status de requisitos e treinamentos de toda empresa</p>
        </div>
        <CompactPurpleButton data-track-action={BUTTONS.comuns.dashboard}
          aria-disabled={onViewDashboards ? undefined : true}
          className="compliance-overview-action"
          onClick={onViewDashboards}
          title={onViewDashboards ? undefined : 'Em breve'}
        >
          Ver dashboards
        </CompactPurpleButton>
      </header>
      <HomeLoadingContent loading={loading} contentKey={JSON.stringify(overview)} skeleton={<div className="compliance-overview-body">
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
        </div>}>
      <div className="compliance-overview-body">
        {overview && <ComplianceDonutChart overview={overview} />}
        <ul aria-label="Legenda do gráfico" className="compliance-legend">
          {overview?.slices.map((slice) => (
            <li key={slice.status}>
              <i aria-hidden="true" className={`compliance-legend-dot compliance-legend-dot--${slice.status}`} />
              {slice.label}
            </li>
          ))}
        </ul>
      </div>
      </HomeLoadingContent>
    </article>
  )
}

export default ComplianceOverviewCard
