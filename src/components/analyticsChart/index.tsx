import type { AnalyticsChart as Chart, ChartKind } from '../../types/dashboard';
import InteractiveChart from '../analyticsInteractiveChart';

interface AnalyticsChartProps { chart: Chart; kind: ChartKind }

export default function AnalyticsChart({ chart, kind }: AnalyticsChartProps) {
  if (!chart.rows.length) return <div className="analytics-chart-empty"><p>{chart.undefinedGroups ? 'O cálculo não tem resultado neste recorte.' : 'Sem dados para este período.'}</p><span>{chart.undefinedGroups ? 'Confira os valores disponíveis e se o divisor é diferente de zero.' : 'Experimente outras datas ou consulte uma visão diferente.'}</span></div>
  return <InteractiveChart key={`${chart.title}/${chart.rows.length}/${chart.rows[0]?.[chart.dimensions[0]]}/${chart.rows.at(-1)?.[chart.dimensions[0]]}`} chart={chart} kind={kind} />
}
