import type { CSSProperties } from 'react'
import type { ComplianceOverview } from '../../types/home'

interface ComplianceDonutChartProps {
  overview: ComplianceOverview
}

const percentageFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

function ComplianceDonutChart({ overview }: ComplianceDonutChartProps) {
  const empty = overview.totalRequirements === 0
  const stops = overview.slices.map((slice, index) => {
    const start = overview.slices.slice(0, index).reduce((total, previous) => total + previous.percentage, 0)
    return `var(--compliance-${slice.status}) ${start}% ${start + slice.percentage}%`
  })
  const style = { '--compliance-donut-fill': empty ? 'var(--position-panel)' : `conic-gradient(from 30deg, ${stops.join(', ')})` } as CSSProperties
  const description = overview.slices.map((slice) => `${slice.label}: ${percentageFormatter.format(slice.percentage)}%`).join('; ')

  return (
    <figure aria-label={empty ? 'Nenhum requisito no workspace.' : `Conformidade geral de ${percentageFormatter.format(overview.overallPercentage)}%. ${description}.`} className="compliance-donut" role="img" style={style}>
      <figcaption aria-hidden="true" className="compliance-donut-center">
        <strong>{empty ? '—' : `${percentageFormatter.format(overview.overallPercentage)}%`}</strong>
        <span>{empty ? 'Sem requisitos' : 'Conformidade geral'}</span>
      </figcaption>
    </figure>
  )
}

export default ComplianceDonutChart
