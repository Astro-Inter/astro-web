import { chartKindLabels } from '../../data/dashboardCatalog'
import type { ChartKind } from '../../types/dashboard'
import AnalyticsEditorSelect from '../analyticsEditorSelect'

interface KindOptionsProps { kinds: readonly ChartKind[]; value: ChartKind; onChange: (kind: ChartKind) => void }

function KindOptions({ kinds, value, onChange }: KindOptionsProps) {
  return <AnalyticsEditorSelect label="Tipo de gráfico" value={value} options={kinds.map(kind => ({ value: kind, label: chartKindLabels[kind] }))} onChange={kind => onChange(kind as ChartKind)} />
}

export default KindOptions
