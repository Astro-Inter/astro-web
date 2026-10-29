import { useEffect, useId, useRef, useState } from 'react'
import { analyticsCatalog, chartKindLabels } from '../../data/dashboardCatalog'
import { aggregateLabels, defaultQuery, explorerKinds, formulaLabels, isExplorerQuery, querySummary } from '../../data/explorer'
import { queryExplorer } from '../../services/dashboards'
import type { AggregateOperation, AnalyticsChart as Chart, AnalyticsFilters, AnalyticsView, AnalyticsWidget, ChartKind, ExplorerCatalog, ExplorerDataset, ExplorerMetric, ExplorerQuery, ExplorerResult } from '../../types/dashboard'
import AnalyticsChart from '../analyticsChart'
import AnalyticsLoadingContent from '../analyticsLoadingContent'
import AnalyticsEditorSkeleton from '../analyticsEditorSkeleton'
import AnalyticsPreviewPlaceholder from '../analyticsPreviewPlaceholder'
import AnalyticsIndicatorGuide from '../analyticsIndicatorGuide'
import AnalyticsFilterRow from '../analyticsFilterRow'
import AstroIcon from '../astroIcon'
import TruncatedText from '../truncatedText'
import PurpleButton from '../purpleButton'
import AnalyticsEditorSelect from '../analyticsEditorSelect'

interface Props {
  hideHeading?: boolean
  widget: AnalyticsWidget | null
  charts: Partial<Record<AnalyticsView, { charts: Chart[] }>>
  pending: boolean
  errors: Partial<Record<AnalyticsView, string>>
  onDataset: (view: AnalyticsView | null) => void
  onSave: (widget: AnalyticsWidget) => void
  onCancel: () => void
  filters: AnalyticsFilters
  workspaceId: string
  catalog?: ExplorerCatalog
  catalogLoading: boolean
  catalogError: string
  retryCatalog: () => void
}
function KindOptions({ kinds, value, onChange }: { kinds: readonly ChartKind[]; value: ChartKind; onChange: (kind: ChartKind) => void }) {
  return <AnalyticsEditorSelect label="Tipo de gráfico" value={value} options={kinds.map(kind => ({ value: kind, label: chartKindLabels[kind] }))} onChange={kind => onChange(kind as ChartKind)} />
}
function MetricFields({ dataset, value, onChange, suffix = '' }: { dataset: ExplorerDataset; value: ExplorerMetric; onChange: (metric: ExplorerMetric) => void; suffix?: string }) {
  const field = dataset.fields.find(item => item.id === value.field) || dataset.fields[0]
  return <div className="analytics-metric-fields">
    <AnalyticsEditorSelect label={`Informação${suffix}`} value={field.id} onChange={value => { const next = dataset.fields.find(item => item.id === value)!; onChange({ field: next.id, operation: next.kind === 'number' ? 'sum' : 'distinct' }) }} options={dataset.fields.map(item => ({ value: item.id, label: item.label }))} />
    <AnalyticsEditorSelect label={`O que deseja calcular?${suffix}`} value={value.operation} onChange={operation => onChange({ ...value, operation: operation as AggregateOperation })} options={[...field.operations].sort((a, b) => Number(b === 'distinct') - Number(a === 'distinct')).map(operation => ({ value: operation, label: aggregateLabels[operation] }))} />
    <details className="analytics-field-help"><summary>Sobre esta informação</summary><div className="analytics-field-help-content"><p>{field.description}</p><p>{field.value}</p></div></details>
  </div>
}
function CatalogEditor({ widget, title, setTitle, catalog, filters, workspaceId, onSave, formId }: { widget: AnalyticsWidget | null; title: string; setTitle: (title: string) => void; catalog: ExplorerCatalog; filters: AnalyticsFilters; workspaceId: string; onSave: Props['onSave']; formId: string }) {
  const [query, setQuery] = useState<ExplorerQuery>(() => widget?.query || defaultQuery(catalog.datasets[0]))
  const dataset = catalog.datasets.find(item => item.id === query.dataset) || catalog.datasets[0]
  const [kind, setKind] = useState<ChartKind>(widget?.type || 'bar')
  const kinds = explorerKinds(query, dataset), effectiveKind = kinds.includes(kind) ? kind : kinds[0]
  const key = JSON.stringify([query, filters, workspaceId])
  const [preview, setPreview] = useState<{ key: string; pending: boolean; result?: ExplorerResult; error?: string }>({ key: '', pending: false })
  const pending = preview.key === key && preview.pending, result = preview.key === key ? preview.result : undefined, error = preview.key === key ? preview.error : undefined
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [key])
  async function calculate() {
    if (!isExplorerQuery(query) || pending) return
    request.current?.abort(); const controller = new AbortController(); request.current = controller
    setPreview(current => ({ key, pending: true, result: current.key === key ? current.result : undefined }))
    try { const value = await queryExplorer(query, filters, workspaceId, controller.signal, !!result); if (!controller.signal.aborted) setPreview({ key, pending: false, result: value }) }
    catch (failure) { if (!controller.signal.aborted) setPreview({ key, pending: false, error: failure instanceof Error ? failure.message : 'Não foi possível calcular a prévia.' }) }
  }
  const filterFields = dataset.fields.filter(field => field.kind === 'text' || field.kind === 'identifier')
  function withMetric(metric: ExplorerMetric) { setQuery({ ...query, metric }) }
  return <div className="analytics-editor-layout analytics-editor-layout--catalog">
    <form id={formId} className="analytics-editor-form" onSubmit={event => { event.preventDefault(); if (title.trim() && isExplorerQuery(query)) onSave({ id: widget?.id || crypto.randomUUID(), datasetId: 'custom', query, title: title.trim(), type: effectiveKind, width: 'half' }) }}>
      <label>Nome do gráfico<input placeholder="Digite o nome do gráfico" maxLength={120} required value={title} onChange={event => setTitle(event.target.value)} /></label>
      <AnalyticsEditorSelect label="Base de dados" value={dataset.id} onChange={value => { const next = catalog.datasets.find(item => item.id === value)!; setQuery(defaultQuery(next)); setKind('bar') }} options={catalog.datasets.map(item => ({ value: item.id, label: item.label }))} />
      <MetricFields dataset={dataset} value={query.metric} onChange={withMetric} />
      <AnalyticsEditorSelect label="Organizar por" value={query.groupBy} onChange={value => { const groupBy = value; setQuery({ ...query, groupBy, series: groupBy === 'none' || query.series === groupBy ? undefined : query.series }) }} options={[{ value: 'none', label: 'Total geral' }, ...dataset.fields.filter(field => field.groupable).map(field => ({ value: field.id, label: field.label + (field.kind === 'date' ? ' · ao longo do tempo' : '') }))]} />
      {query.groupBy !== 'none' && <AnalyticsEditorSelect label="Detalhar por" value={query.series || ''} onChange={value => setQuery({ ...query, series: value || undefined })} options={[{ value: '', label: 'Sem detalhamento adicional' }, ...dataset.fields.filter(field => field.groupable && field.kind !== 'date' && field.id !== query.groupBy).map(field => ({ value: field.id, label: field.label }))]} />}
      <details className="analytics-advanced" open={!!query.formula || query.where.length > 0}><summary>Opções avançadas</summary><div className="analytics-advanced-content">
      <label className="analytics-checkbox-label"><input type="checkbox" checked={!!query.formula} onChange={event => { const field = dataset.fields.find(item => item.id === 'registros') || dataset.fields[0]; setQuery({ ...query, formula: event.target.checked ? { operator: 'divide', operand: { field: field.id, operation: field.kind === 'number' ? 'sum' : 'distinct' } } : undefined }) }} />Combinar com outro indicador</label>
      {query.formula && <div className="analytics-formula-fields"><AnalyticsEditorSelect label="Como combinar?" value={query.formula.operator} onChange={value => setQuery({ ...query, formula: { ...query.formula!, operator: value as NonNullable<ExplorerQuery['formula']>['operator'] } })} options={Object.entries(formulaLabels).map(([value, label]) => ({ value, label }))} /><MetricFields dataset={dataset} suffix=" do segundo indicador" value={query.formula.operand} onChange={operand => setQuery({ ...query, formula: { ...query.formula!, operand } })} /><p className="analytics-note">Os dois indicadores usam a mesma base e os mesmos filtros. Uma divisão por zero aparece como cálculo sem resultado.</p></div>}
      <details className="analytics-filter-builder" open={query.where.length > 0}><summary>Filtrar registros{query.where.length ? ` (${query.where.length})` : ''}</summary><div className="analytics-filter-content">{query.where.map((condition, index) => <AnalyticsFilterRow key={index} number={index + 1} onRemove={() => setQuery(current => ({ ...current, where: current.where.filter(item => item !== condition) }))}><AnalyticsEditorSelect label={`Campo do filtro ${index + 1}`} value={condition.field} onChange={value => setQuery({ ...query, where: query.where.map((item, position) => position === index ? { ...item, field: value } : item) })} options={filterFields.map(field => ({ value: field.id, label: field.label }))} /><AnalyticsEditorSelect label="Comparação" value={condition.operator} onChange={value => setQuery({ ...query, where: query.where.map((item, position) => position === index ? { ...item, operator: value as 'equals' | 'not_equals' } : item) })} options={[{ value: 'equals', label: 'É igual a' }, { value: 'not_equals', label: 'É diferente de' }]} /><label>Valor<input maxLength={120} value={condition.value} placeholder="Informe o valor desejado" onChange={event => setQuery({ ...query, where: query.where.map((item, position) => position === index ? { ...item, value: event.target.value } : item) })} /></label></AnalyticsFilterRow>)}<button type="button" className="create-forms-add-question analytics-filter-add" disabled={query.where.length >= 3 || !filterFields.length} onClick={() => setQuery({ ...query, where: [...query.where, { field: filterFields[0].id, operator: 'equals', value: '' }] })}><AstroIcon name="plus" /><span>Adicionar filtro</span></button></div></details>
      </div></details>
      <KindOptions kinds={kinds} value={effectiveKind} onChange={setKind} />
    </form>
    <div className={`analytics-editor-preview analytics-editor-preview--catalog${!pending && !result && !error ? ' analytics-editor-preview--empty' : ''}`}><h3><TruncatedText nativeEllipsis maxLines={2}>{`Prévia · ${title || 'Meu gráfico'}`}</TruncatedText></h3><p className="analytics-calculation-summary"><TruncatedText nativeEllipsis>{querySummary(query, dataset)}</TruncatedText></p><AnalyticsLoadingContent loading={pending} chartKind={effectiveKind} timestamp legend={result ? result.chart.dimensions.length > 1 : !!query.series} descriptionLines={result ? Number(!result.chart.dateSensitive) + Number(!!result.chart.undefinedGroups) : 0} contentKey={JSON.stringify([effectiveKind, result, error])}>{error ? <p className="analytics-feedback" role="alert">{error}</p> : result ? <><AnalyticsChart chart={result.chart} kind={effectiveKind} /><p className="analytics-note">Consultado em {new Date(result.generatedAt).toLocaleString('pt-BR')}{result.cache?.hit ? ' · resultado em cache' : ''}</p></> : <AnalyticsPreviewPlaceholder />}</AnalyticsLoadingContent><PurpleButton type="button" className="analytics-secondary" disabled={pending || !isExplorerQuery(query)} onClick={() => void calculate()}>{pending ? 'Calculando…' : result ? 'Atualizar prévia' : 'Gerar prévia'}</PurpleButton></div>
  </div>
}
export default function AnalyticsEditor(props: Props) {
  const formId = useId()
  const { widget, charts, pending, errors, onDataset, onSave, onCancel, catalog, catalogLoading, catalogError, retryCatalog } = props
  const [mode, setMode] = useState<'catalog' | 'ready'>(!widget || widget.datasetId === 'custom' ? 'catalog' : 'ready')
  const [datasetId, setDatasetId] = useState(widget?.datasetId !== 'custom' && widget?.datasetId || analyticsCatalog[0].id)
  const source = analyticsCatalog.find(item => item.id === datasetId) || analyticsCatalog[0]
  const [title, setTitle] = useState(widget?.title || 'Meu gráfico')
  const [kind, setKind] = useState<ChartKind>(widget?.type || source.types[0])
  const effectiveKind = source.types.includes(kind) ? kind : source.types[0]
  const chart = charts[source.view]?.charts[source.index]
  return <section className="create-forms-card analytics-editor" aria-label={props.hideHeading ? 'Configuração do gráfico' : undefined} aria-labelledby={props.hideHeading ? undefined : 'chart-editor-title'}>
    {!props.hideHeading && <header className="analytics-editor-heading"><h2 id="chart-editor-title">{widget ? 'Editar gráfico' : 'Criar gráfico'}</h2><span className="create-forms-question-actions"><button type="button" className="analytics-icon-button" aria-label="Fechar editor" onClick={onCancel}><AstroIcon name="close" /></button></span></header>}
    <div className="analytics-editor-modes"><AnalyticsEditorSelect label="Como deseja criar o gráfico?" value={mode} options={[{ value: 'catalog', label: 'Montar meu cálculo' }, { value: 'ready', label: 'Usar indicador pronto' }]} onChange={value => { const next = value as 'catalog' | 'ready'; setMode(next); onDataset(next === 'ready' ? source.view : null) }} /></div>
    <div className="analytics-mode-content" key={mode}>{mode === 'catalog' ? <AnalyticsLoadingContent loading={catalogLoading} variant="fields" skeleton={<AnalyticsEditorSkeleton title={title} />} label="Carregando as bases e os campos disponíveis…">{catalogError || !catalog ? <div className="analytics-feedback"><p role="alert">{catalogError || 'Catálogo indisponível.'}</p><PurpleButton type="button" className="analytics-secondary" onClick={retryCatalog}>Tentar novamente</PurpleButton></div> : <CatalogEditor widget={widget} title={title} setTitle={setTitle} catalog={catalog} filters={props.filters} workspaceId={props.workspaceId} onSave={onSave} formId={formId} />}</AnalyticsLoadingContent> : <div className="analytics-editor-layout analytics-editor-layout--ready">
      <form id={formId} className="analytics-editor-form" onSubmit={event => { event.preventDefault(); if (title.trim()) onSave({ id: widget?.id || crypto.randomUUID(), datasetId, title: title.trim(), type: effectiveKind, width: 'half' }) }}>
        <label>Nome do gráfico<input placeholder="Digite o nome do gráfico" maxLength={120} required value={title} onChange={event => setTitle(event.target.value)} /></label>
        <AnalyticsEditorSelect label="Indicador" value={datasetId} onChange={value => { const item = analyticsCatalog.find(entry => entry.id === value)!; setDatasetId(item.id); setTitle(item.label); setKind(item.types[0]); onDataset(item.view) }} options={analyticsCatalog.map(item => ({ value: item.id, label: item.label }))} />
        <KindOptions kinds={source.types} value={effectiveKind} onChange={setKind} />
        <AnalyticsIndicatorGuide indicatorId={source.id} dateSensitive={chart?.dateSensitive} />
        </form>
      <div className="analytics-editor-preview"><h3><TruncatedText nativeEllipsis maxLines={2}>{`Prévia · ${title || source.label}`}</TruncatedText></h3><AnalyticsLoadingContent loading={pending} chartKind={effectiveKind} legend={!!chart && chart.dimensions.length > 1} descriptionLines={chart ? Number(!chart.dateSensitive) + Number(!!chart.undefinedGroups) : 0} contentKey={JSON.stringify([datasetId, effectiveKind, chart, errors[source.view]])}>{errors[source.view] ? <p role="alert" className="analytics-feedback">{errors[source.view]}</p> : chart ? <AnalyticsChart chart={chart} kind={effectiveKind} /> : <p className="analytics-empty">Escolha um indicador para visualizar os dados.</p>}</AnalyticsLoadingContent></div>
    </div>}</div>
    <div className="astro-modal-actions analytics-editor-actions">
      <button type="button" className="astro-modal-cancel" onClick={onCancel}>Cancelar</button>
      <PurpleButton type="submit" form={formId} disabled={mode === 'catalog' && (catalogLoading || !!catalogError || !catalog)}>{widget ? 'Salvar alterações' : 'Adicionar gráfico'}</PurpleButton>
    </div>
  </section>
}
