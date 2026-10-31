import { useState, type SetStateAction } from 'react'
import { defaultQuery, explorerKinds, formulaLabels, isExplorerQuery, querySummary } from '../../data/explorer'
import { useExplorerPreview } from '../../hooks/useExplorerPreview'
import type { AnalyticsFilters, AnalyticsWidget, ChartKind, ExplorerCatalog, ExplorerMetric, ExplorerQuery } from '../../types/dashboard'
import { validateAndSanitizeExplorerQuery, validateChartTitle } from '../../utils/dashboardQuery'
import AnalyticsChart from '../analyticsChart'
import AnalyticsEditorSelect from '../analyticsEditorSelect'
import AnalyticsFilterRow from '../analyticsFilterRow'
import AnalyticsLoadingContent from '../analyticsLoadingContent'
import AnalyticsPreviewPlaceholder from '../analyticsPreviewPlaceholder'
import AnimatedFieldError from '../animatedFieldError'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'
import TruncatedText from '../truncatedText'

import KindOptions from '../analyticsKindOptions'
import MetricFields from '../analyticsMetricFields'
interface CatalogEditorProps { widget: AnalyticsWidget | null; title: string; setTitle: (title: string) => void; catalog: ExplorerCatalog; filters: AnalyticsFilters; workspaceId: string; onSave: (widget: AnalyticsWidget) => void; formId: string }

function CatalogEditor({ widget, title, setTitle, catalog, filters, workspaceId, onSave, formId }: CatalogEditorProps) {
  const [configuration, setConfiguration] = useState(() => ({ query: { ...(widget?.query || defaultQuery(catalog.datasets[0])), where: (widget?.query?.where || []).map(row => ({ ...row, id: crypto.randomUUID() })) } as ExplorerQuery, kind: widget?.type || 'bar' as ChartKind }))
  const { query, kind } = configuration
  function setQuery(change: SetStateAction<ExplorerQuery>) { setValidationErrors({}); setConfiguration(current => ({ ...current, query: typeof change === 'function' ? change(current.query) : change })) }
  function setKind(kind: ChartKind) { setConfiguration(current => ({ ...current, kind })) }
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const nameError = validationErrors.title || ''
  function setNameError(title: string) { setValidationErrors(current => ({ ...current, title })) }
  const dataset = catalog.datasets.find(item => item.id === query.dataset) || catalog.datasets[0]
  const kinds = explorerKinds(query, dataset), effectiveKind = kinds.includes(kind) ? kind : kinds[0]
  const { pending, result, error, calculate } = useExplorerPreview(query, filters, workspaceId, catalog)
  const filterFields = dataset.fields.filter(field => field.kind === 'text' || field.kind === 'identifier')
  function withMetric(metric: ExplorerMetric) { setQuery({ ...query, metric }) }
  return <div className="analytics-editor-layout analytics-editor-layout--catalog">
    <form id={formId} className="analytics-editor-form" onSubmit={event => { event.preventDefault(); const error = validateChartTitle(title); setNameError(error); const validation = validateAndSanitizeExplorerQuery(query, catalog); setValidationErrors({ ...validation.errors, title: error }); if (!error && validation.values) onSave({ id: widget?.id || crypto.randomUUID(), datasetId: 'custom', query: validation.values, title: title.trim(), type: effectiveKind, width: 'half' }) }}>
      <label htmlFor={`${formId}-title`}>Nome do gráfico<input id={`${formId}-title`} placeholder="Digite o nome do gráfico" maxLength={120} required value={title} aria-invalid={!!nameError} aria-describedby={nameError ? `${formId}-title-error` : undefined} onChange={event => { setNameError(''); setTitle(event.target.value) }} /></label><AnimatedFieldError id={`${formId}-title-error`} message={nameError} />
      <AnalyticsEditorSelect label="Base de dados" value={dataset.id} onChange={value => { const next = catalog.datasets.find(item => item.id === value)!; setQuery(defaultQuery(next)); setKind('bar') }} options={catalog.datasets.map(item => ({ value: item.id, label: item.label }))} />
      <MetricFields dataset={dataset} value={query.metric} onChange={withMetric} />
      <AnalyticsEditorSelect label="Organizar por" value={query.groupBy} onChange={value => { const groupBy = value; setQuery({ ...query, groupBy, series: groupBy === 'none' || query.series === groupBy ? undefined : query.series }) }} options={[{ value: 'none', label: 'Total geral' }, ...dataset.fields.filter(field => field.groupable).map(field => ({ value: field.id, label: field.label + (field.kind === 'date' ? ' · ao longo do tempo' : '') }))]} />
      {query.groupBy !== 'none' && <AnalyticsEditorSelect label="Detalhar por" value={query.series || ''} onChange={value => setQuery({ ...query, series: value || undefined })} options={[{ value: '', label: 'Sem detalhamento adicional' }, ...dataset.fields.filter(field => field.groupable && field.kind !== 'date' && field.id !== query.groupBy).map(field => ({ value: field.id, label: field.label }))]} />}
      <details className="analytics-advanced" open={!!query.formula || query.where.length > 0}><summary>Opções avançadas</summary><div className="analytics-advanced-content">
      <label htmlFor={`${formId}-formula`} className="analytics-checkbox-label"><input id={`${formId}-formula`} type="checkbox" checked={!!query.formula} onChange={event => { const field = dataset.fields.find(item => item.id === 'registros') || dataset.fields[0]; setQuery({ ...query, formula: event.target.checked ? { operator: 'divide', operand: { field: field.id, operation: field.kind === 'number' ? 'sum' : 'distinct' } } : undefined }) }} />Combinar com outro indicador</label>
      {query.formula && <div className="analytics-formula-fields"><AnalyticsEditorSelect label="Como combinar?" value={query.formula.operator} onChange={value => setQuery({ ...query, formula: { ...query.formula!, operator: value as NonNullable<ExplorerQuery['formula']>['operator'] } })} options={Object.entries(formulaLabels).map(([value, label]) => ({ value, label }))} /><MetricFields dataset={dataset} suffix=" do segundo indicador" value={query.formula.operand} onChange={operand => setQuery({ ...query, formula: { ...query.formula!, operand } })} /><p className="analytics-note">Os dois indicadores usam a mesma base e os mesmos filtros. Uma divisão por zero aparece como cálculo sem resultado.</p></div>}
      <details className="analytics-filter-builder" open={query.where.length > 0}><summary>Filtrar registros{query.where.length ? ` (${query.where.length})` : ''}</summary><div className="analytics-filter-content">{query.where.map((condition, index) => <AnalyticsFilterRow key={condition.id} number={index + 1} onRemove={() => setQuery(current => ({ ...current, where: current.where.filter(item => item !== condition) }))}><AnalyticsEditorSelect label={`Campo do filtro ${index + 1}`} error={validationErrors[`filter.${index}.field`]} value={condition.field} onChange={value => setQuery({ ...query, where: query.where.map((item, position) => position === index ? { ...item, field: value } : item) })} options={filterFields.map(field => ({ value: field.id, label: field.label }))} /><AnalyticsEditorSelect label="Comparação" error={validationErrors[`filter.${index}.operator`]} value={condition.operator} onChange={value => setQuery({ ...query, where: query.where.map((item, position) => position === index ? { ...item, operator: value as 'equals' | 'not_equals' } : item) })} options={[{ value: 'equals', label: 'É igual a' }, { value: 'not_equals', label: 'É diferente de' }]} /><label htmlFor={`${formId}-filter-${condition.id}`}>Valor<input id={`${formId}-filter-${condition.id}`} maxLength={120} aria-invalid={!!validationErrors[`filter.${index}.value`]} aria-describedby={validationErrors[`filter.${index}.value`] ? `${formId}-filter-${condition.id}-error` : undefined} value={condition.value} placeholder="Informe o valor desejado" onChange={event => setQuery({ ...query, where: query.where.map((item, position) => position === index ? { ...item, value: event.target.value } : item) })} /></label><AnimatedFieldError id={`${formId}-filter-${condition.id}-error`} message={validationErrors[`filter.${index}.value`] || ''} /></AnalyticsFilterRow>)}<button type="button" className="create-forms-add-question analytics-filter-add" disabled={query.where.length >= 3 || !filterFields.length} onClick={() => setQuery({ ...query, where: [...query.where, { id: crypto.randomUUID(), field: filterFields[0].id, operator: 'equals', value: '' }] })}><AstroIcon name="plus" /><span>Adicionar filtro</span></button></div></details>
      </div></details>
      {Object.entries(validationErrors).filter(([key, message]) => key !== 'title' && !key.startsWith('filter.') && message).map(([key, message]) => <AnimatedFieldError key={key} message={message} />)}
      <KindOptions kinds={kinds} value={effectiveKind} onChange={setKind} />
    </form>
    <div className={`analytics-editor-preview analytics-editor-preview--catalog${!pending && !result && !error ? ' analytics-editor-preview--empty' : ''}`}><h3><TruncatedText nativeEllipsis maxLines={2}>{`Prévia · ${title || 'Meu gráfico'}`}</TruncatedText></h3><p className="analytics-calculation-summary"><TruncatedText nativeEllipsis>{querySummary(query, dataset)}</TruncatedText></p><AnalyticsLoadingContent loading={pending} chartKind={effectiveKind} timestamp legend={result ? result.chart.dimensions.length > 1 : !!query.series} descriptionLines={result ? Number(!result.chart.dateSensitive) + Number(!!result.chart.undefinedGroups) : 0} contentKey={JSON.stringify([effectiveKind, result, error])}>{error ? <p className="analytics-feedback" role="alert">{error}</p> : result ? <><AnalyticsChart chart={result.chart} kind={effectiveKind} /><p className="analytics-note">Consultado em {new Date(result.generatedAt).toLocaleString('pt-BR')}{result.cache?.hit ? ' · resultado em cache' : ''}</p></> : <AnalyticsPreviewPlaceholder />}</AnalyticsLoadingContent><PurpleButton type="button" className="analytics-secondary" disabled={pending || !isExplorerQuery(query)} onClick={() => void calculate()}>{pending ? 'Calculando…' : result ? 'Atualizar prévia' : 'Gerar prévia'}</PurpleButton></div>
  </div>
}

export default CatalogEditor
