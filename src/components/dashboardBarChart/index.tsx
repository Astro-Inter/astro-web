import type { CSSProperties } from 'react'
import type { DashboardChartData } from '../../types/dashboard'

interface DashboardBarChartProps {
  chart: DashboardChartData
}

function DashboardBarChart({ chart }: DashboardBarChartProps) {
  return <figure className="dashboard-chart" aria-labelledby={`${chart.id}-title`}>
    <figcaption className="astro-card-title" id={`${chart.id}-title`}>{chart.title}</figcaption>
    <div className="dashboard-chart-plot">
      <div className="dashboard-chart-axis create-forms-label" aria-hidden="true">
        {[1, .75, .5, .25, 0].map(fraction => <span key={fraction}>{chart.maximum * fraction}{chart.unit}</span>)}
      </div>
      <div className="dashboard-chart-categories">
        {chart.categories.map(category => <div className="dashboard-chart-category" key={category.id}>
          <div className="dashboard-chart-bars">
            {chart.series.map((series, index) => {
              const value = category.values[index] ?? 0
              const description = `${category.label} · ${series.label}: ${value}${chart.unit}`
              return <span role="img" aria-label={description} className={`dashboard-chart-bar dashboard-chart-bar--${series.color}`} key={series.id}
                style={{ '--dashboard-bar-height': `${Math.max(0, Math.min(100, value / chart.maximum * 100))}%` } as CSSProperties} />
            })}
          </div>
          <span className="dashboard-chart-category-label create-forms-label">{category.label}</span>
        </div>)}
      </div>
    </div>
    <ul className="dashboard-chart-legend" aria-label={`Legenda de ${chart.title}`}>
      {chart.series.map(series => <li className="create-forms-label" key={series.id}><i aria-hidden="true" className={`dashboard-chart-key dashboard-chart-bar--${series.color}`} />{series.label}</li>)}
    </ul>
  </figure>
}

export default DashboardBarChart
