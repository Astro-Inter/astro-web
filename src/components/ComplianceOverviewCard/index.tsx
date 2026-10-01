import CompactPurpleButton from '../CompactPurpleButton'
import ComplianceDonutChart from '../ComplianceDonutChart'
import type { ComplianceOverview } from '../../types/home'

interface ComplianceOverviewCardProps {
  overview: ComplianceOverview
  onViewDashboards?: () => void
}

function ComplianceOverviewCard({ overview, onViewDashboards }: ComplianceOverviewCardProps) {
  return (
    <article aria-labelledby="compliance-overview-title" className="home-card compliance-overview">
      <header className="compliance-overview-header">
        <div>
          <h3 id="compliance-overview-title">Visão geral de conformidade</h3>
          <p>Status de requisitos e treinamentos de toda empresa</p>
        </div>
        <CompactPurpleButton
          aria-disabled={onViewDashboards ? undefined : true}
          className="compliance-overview-action"
          onClick={onViewDashboards}
          title={onViewDashboards ? undefined : 'Em breve'}
        >
          Ver dashboards
        </CompactPurpleButton>
      </header>
      <div className="compliance-overview-body">
        <ComplianceDonutChart overview={overview} />
        <ul aria-label="Legenda do gráfico" className="compliance-legend">
          {overview.slices.map((slice) => (
            <li key={slice.status}>
              <i aria-hidden="true" className={`compliance-legend-dot compliance-legend-dot--${slice.status}`} />
              {slice.label}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export default ComplianceOverviewCard
