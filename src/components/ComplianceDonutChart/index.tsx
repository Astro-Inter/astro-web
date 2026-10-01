import type { CSSProperties } from 'react'
import type { ComplianceOverview } from '../../types/home'

interface ComplianceDonutChartProps {
  overview: ComplianceOverview
}

const percentageFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

 //Gráfico temporário
function ComplianceDonutChart({ overview }: ComplianceDonutChartProps) {
  const stops = overview.slices.map((slice, index) => {
    const start = overview.slices.slice(0, index).reduce((total, previous) => total + previous.percentage, 0)
    return `var(--compliance-${slice.status}) ${start}% ${start + slice.percentage}%`
  })
  const style = { '--compliance-donut-fill': `conic-gradient(from 30deg, ${stops.join(', ')})` } as CSSProperties
  const description = overview.slices.map((slice) => `${slice.label}: ${percentageFormatter.format(slice.percentage)}%`).join('; ')

  return (
    <figure aria-label={`Conformidade geral de ${overview.overallPercentage}%. ${description}.`} className="compliance-donut" role="img" style={style}>
      <figcaption aria-hidden="true" className="compliance-donut-center">
        <strong>{overview.overallPercentage}%</strong>
        <span>Conformidade geral</span>
      </figcaption>
    </figure>
  )
}

export default ComplianceDonutChart
