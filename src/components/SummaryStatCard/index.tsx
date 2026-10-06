import { Link } from 'react-router-dom'
import AstroIcon from '../astroIcon'
import type { SummaryStat } from '../../types/home'

interface SummaryStatCardProps {
  stat: SummaryStat
}

const numberFormatter = new Intl.NumberFormat('pt-BR')

function SummaryStatCard({ stat }: SummaryStatCardProps) {
  const icon = <AstroIcon name={stat.icon} />

  return (
    <article aria-labelledby={`summary-stat-${stat.id}`} className="home-card summary-stat">
      <h3 id={`summary-stat-${stat.id}`}>{stat.label}</h3>
      <div className="summary-stat-row">
        <strong className="summary-stat-value">{numberFormatter.format(stat.value)}</strong>
        {stat.path ? (
          <Link aria-label={`Ver ${stat.label.toLocaleLowerCase('pt-BR')}`} className="summary-stat-link" to={stat.path}>{icon}</Link>
        ) : (
          <span aria-hidden="true" className="summary-stat-link summary-stat-link--unavailable" title="Em breve">{icon}</span>
        )}
      </div>
    </article>
  )
}

export default SummaryStatCard
