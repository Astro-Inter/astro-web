import { indicatorDescriptions } from '../../data/dashboardCatalog'

interface AnalyticsIndicatorGuideProps { indicatorId: string; dateSensitive?: boolean }

export default function AnalyticsIndicatorGuide({ indicatorId, dateSensitive }: AnalyticsIndicatorGuideProps) {
  return <aside className="analytics-indicator-guide" aria-label="Sobre o indicador">
    <div className="analytics-indicator-guide-copy">
    <h4>Sobre o indicador</h4>
    <p>{indicatorDescriptions[indicatorId]}</p>
    {dateSensitive !== undefined && <p className="analytics-indicator-guide-scope">{dateSensitive ? 'Os resultados seguem os filtros desta visão.' : 'Este indicador mostra a situação atual, sem filtro de período.'}</p>}
    </div>
  </aside>
}
