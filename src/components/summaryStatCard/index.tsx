import { BUTTONS } from '../../gtm/buttons'
import { Link } from 'react-router-dom'
import AstroIcon from '../astroIcon'
import type { SummaryStat } from '../../types/home'

interface SummaryStatCardProps {
  stat: SummaryStat
  loading?: boolean
}

const numberFormatter = new Intl.NumberFormat('pt-BR')

function SummaryStatCard({ stat, loading = false }: SummaryStatCardProps) {
  const icon = <AstroIcon name={stat.icon} />

  return (
    <article aria-labelledby={`summary-stat-${stat.id}`} className="home-card summary-stat">
      <h3 id={`summary-stat-${stat.id}`}>{stat.label}</h3>
      <div className="summary-stat-row">
        <strong className="summary-stat-value">{loading ? <span aria-hidden="true" className="home-skeleton home-skeleton-value" /> : numberFormatter.format(stat.value)}</strong>
        {stat.path ? (
          <Link data-track-action={stat.path === '/mainUnitScreen' ? BUTTONS.comuns.unidade : BUTTONS.comuns.colaboradores} aria-label={`Ver ${stat.label.toLocaleLowerCase('pt-BR')}`} className="summary-stat-link" to={stat.path}>{icon}</Link>
        ) : (
          <span aria-hidden="true" className="summary-stat-link summary-stat-link--unavailable" title="Em breve">{icon}</span>
        )}
      </div>
    </article>
  )
}

export default SummaryStatCard
