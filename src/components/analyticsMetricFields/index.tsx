import { aggregateLabels } from '../../data/explorer'
import type { AggregateOperation, ExplorerDataset, ExplorerMetric } from '../../types/dashboard'
import AnalyticsEditorSelect from '../analyticsEditorSelect'

interface MetricFieldsProps { dataset: ExplorerDataset; value: ExplorerMetric; onChange: (metric: ExplorerMetric) => void; suffix?: string }

function MetricFields({ dataset, value, onChange, suffix = '' }: MetricFieldsProps) {
  const field = dataset.fields.find(item => item.id === value.field) || dataset.fields[0]
  return <div className="analytics-metric-fields">
    <AnalyticsEditorSelect label={`Informação${suffix}`} value={field.id} onChange={value => { const next = dataset.fields.find(item => item.id === value)!; onChange({ field: next.id, operation: next.kind === 'number' ? 'sum' : 'distinct' }) }} options={dataset.fields.map(item => ({ value: item.id, label: item.label }))} />
    <AnalyticsEditorSelect label={`O que deseja calcular?${suffix}`} value={value.operation} onChange={operation => onChange({ ...value, operation: operation as AggregateOperation })} options={[...field.operations].sort((a, b) => Number(b === 'distinct') - Number(a === 'distinct')).map(operation => ({ value: operation, label: aggregateLabels[operation] }))} />
    <details className="analytics-field-help"><summary>Sobre esta informação</summary><div className="analytics-field-help-content"><p>{field.description}</p><p>{field.value}</p></div></details>
  </div>
}

export default MetricFields
