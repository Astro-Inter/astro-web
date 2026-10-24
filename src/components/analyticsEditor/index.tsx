import { useEffect, useRef, useState } from 'react'
import { analyticsCatalog, chartKindLabels } from '../../data/dashboardCatalog'
import { aggregateLabels, defaultQuery, explorerKinds, formulaLabels, isExplorerQuery, querySummary } from '../../data/explorer'
import { queryExplorer } from '../../services/dashboards'
import type { AggregateOperation, AnalyticsChart as Chart, AnalyticsFilters, AnalyticsView, AnalyticsWidget, ChartKind, ExplorerCatalog, ExplorerDataset, ExplorerMetric, ExplorerQuery, ExplorerResult } from '../../types/dashboard'
import AnalyticsChart from '../analyticsChart'
import AstroIcon from '../astroIcon'

interface Props {
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
  return <fieldset className="analytics-kind-options"><legend>Tipo de gráfico</legend>{kinds.map(kind => <button type="button" key={kind} aria-pressed={value === kind} onClick={() => onChange(kind)}>{chartKindLabels[kind]}</button>)}</fieldset>
}
function MetricFields({ dataset, value, onChange, suffix = '' }: { dataset: ExplorerDataset; value: ExplorerMetric; onChange: (metric: ExplorerMetric) => void; suffix?: string }) {
  const field = dataset.fields.find(item => item.id === value.field) || dataset.fields[0]
  return <div className="analytics-metric-fields">
    <label>Informação{suffix}<select aria-label={`Informação${suffix}`} value={field.id} onChange={event => { const next = dataset.fields.find(item => item.id === event.target.value)!; onChange({ field: next.id, operation: next.kind === 'number' ? 'sum' : 'distinct' }) }}>{dataset.fields.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <p className="analytics-field-description">{field.description}</p>
    <label>O que deseja calcular?{suffix}<select aria-label={`O que deseja calcular?${suffix}`} value={value.operation} onChange={event => onChange({ ...value, operation: event.target.value as AggregateOperation })}>{field.operations.map(operation => <option key={operation} value={operation}>{aggregateLabels[operation]}</option>)}</select></label>
    <p className="analytics-field-purpose">{field.value}</p>
    {field.kind === 'identifier' && <p className="analytics-note">Este campo identifica registros. Para saber quantos existem, conte os valores diferentes; IDs não são somados.</p>}
    <details className="analytics-source-details"><summary>Nome no catálogo</summary><p>{field.sourceColumn || 'Medida calculada a partir dos registros.'}</p></details>
  </div>
}
function CatalogEditor({ widget, title, setTitle, catalog, filters, workspaceId, onSave, onCancel }: { widget: AnalyticsWidget | null; title: string; setTitle: (title: string) => void; catalog: ExplorerCatalog; filters: AnalyticsFilters; workspaceId: string; onSave: Props['onSave']; onCancel: Props['onCancel'] }) {
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
    setPreview({ key, pending: true })
    try { const value = await queryExplorer(query, filters, workspaceId, controller.signal, !!result); if (!controller.signal.aborted) setPreview({ key, pending: false, result: value }) }
    catch (failure) { if (!controller.signal.aborted) setPreview({ key, pending: false, error: failure instanceof Error ? failure.message : 'Não foi possível calcular a prévia.' }) }
  }
  const filterFields = dataset.fields.filter(field => field.kind === 'text' || field.kind === 'identifier')
  function withMetric(metric: ExplorerMetric) { setQuery({ ...query, metric }) }
  return <div className="analytics-editor-layout analytics-editor-layout--catalog">
    <form className="analytics-editor-form" onSubmit={event => { event.preventDefault(); if (title.trim() && isExplorerQuery(query)) onSave({ id: widget?.id || crypto.randomUUID(), datasetId: 'custom', query, title: title.trim(), type: effectiveKind, width: 'half' }) }}>
      <label>Nome do gráfico<input autoFocus maxLength={120} required value={title} onChange={event => setTitle(event.target.value)} /></label>
      <label>Base de dados<select aria-label="Base de dados" value={dataset.id} onChange={event => { const next = catalog.datasets.find(item => item.id === event.target.value)!; setQuery(defaultQuery(next)); setKind('bar') }}>{catalog.datasets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <div className="analytics-dataset-help"><p>{dataset.description}</p><p className="analytics-note">{dataset.dateDescription}</p><details className="analytics-source-details"><summary>Origem no catálogo</summary><p>{dataset.source}</p></details></div>
      <MetricFields dataset={dataset} value={query.metric} onChange={withMetric} />
      <label>Organizar por<select aria-label="Organizar por" value={query.groupBy} onChange={event => { const groupBy = event.target.value; setQuery({ ...query, groupBy, series: groupBy === 'none' || query.series === groupBy ? undefined : query.series }) }}><option value="none">Total geral</option>{dataset.fields.filter(field => field.groupable).map(field => <option key={field.id} value={field.id}>{field.label}{field.kind === 'date' ? ' · ao longo do tempo' : ''}</option>)}</select></label>
      {query.groupBy !== 'none' && <label>Detalhar por<select aria-label="Detalhar por" value={query.series || ''} onChange={event => setQuery({ ...query, series: event.target.value || undefined })}><option value="">Sem detalhamento adicional</option>{dataset.fields.filter(field => field.groupable && field.kind !== 'date' && field.id !== query.groupBy).map(field => <option key={field.id} value={field.id}>{field.label}</option>)}</select></label>}
      <label className="analytics-checkbox-label"><input type="checkbox" checked={!!query.formula} onChange={event => { const field = dataset.fields.find(item => item.id === 'registros') || dataset.fields[0]; setQuery({ ...query, formula: event.target.checked ? { operator: 'divide', operand: { field: field.id, operation: field.kind === 'number' ? 'sum' : 'distinct' } } : undefined }) }} />Combinar com outro indicador</label>
      {query.formula && <div className="analytics-formula-fields"><label>Como combinar?<select aria-label="Como combinar?" value={query.formula.operator} onChange={event => setQuery({ ...query, formula: { ...query.formula!, operator: event.target.value as NonNullable<ExplorerQuery['formula']>['operator'] } })}>{Object.entries(formulaLabels).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><MetricFields dataset={dataset} suffix=" do segundo indicador" value={query.formula.operand} onChange={operand => setQuery({ ...query, formula: { ...query.formula!, operand } })} /><p className="analytics-note">Os dois indicadores usam a mesma base e os mesmos filtros. Uma divisão por zero aparece como cálculo sem resultado.</p></div>}
      <details className="analytics-filter-builder"><summary>Filtrar registros{query.where.length ? ` (${query.where.length})` : ''}</summary>{query.where.map((condition, index) => <div className="analytics-condition" key={index}><label>Campo do filtro {index + 1}<select value={condition.field} onChange={event => setQuery({ ...query, where: query.where.map((item, position) => position === index ? { ...item, field: event.target.value } : item) })}>{filterFields.map(field => <option key={field.id} value={field.id}>{field.label}</option>)}</select></label><label>Comparação<select value={condition.operator} onChange={event => setQuery({ ...query, where: query.where.map((item, position) => position === index ? { ...item, operator: event.target.value as 'equals' | 'not_equals' } : item) })}><option value="equals">É igual a</option><option value="not_equals">É diferente de</option></select></label><label>Valor<input maxLength={120} value={condition.value} placeholder="Informe o valor desejado" onChange={event => setQuery({ ...query, where: query.where.map((item, position) => position === index ? { ...item, value: event.target.value } : item) })} /></label><button type="button" className="analytics-text-button" onClick={() => setQuery({ ...query, where: query.where.filter((_, position) => position !== index) })}>Remover filtro {index + 1}</button></div>)}<button type="button" className="analytics-text-button" disabled={query.where.length >= 3} onClick={() => setQuery({ ...query, where: [...query.where, { field: filterFields[0].id, operator: 'equals', value: '' }] })}>Adicionar filtro</button></details>
      <KindOptions kinds={kinds} value={effectiveKind} onChange={setKind} />
      <div className="analytics-actions"><button type="button" className="analytics-secondary" onClick={onCancel}>Cancelar</button><button type="submit" className="analytics-primary" disabled={!title.trim() || !isExplorerQuery(query)}>{widget ? 'Aplicar alteração' : 'Adicionar à visão'}</button></div>
    </form>
    <div className="analytics-editor-preview analytics-editor-preview--catalog"><h3>Prévia · {title || 'Meu gráfico'}</h3><p className="analytics-calculation-summary">{querySummary(query, dataset)}</p><button type="button" className="analytics-secondary" disabled={pending || !isExplorerQuery(query)} onClick={() => void calculate()}>{pending ? 'Calculando…' : result ? 'Atualizar prévia' : 'Gerar prévia'}</button>{pending ? <p className="analytics-empty" role="status">Consultando o Databricks…</p> : error ? <p className="analytics-feedback" role="alert">{error}</p> : result ? <><AnalyticsChart chart={result.chart} kind={effectiveKind} /><p className="analytics-note">Consultado em {new Date(result.generatedAt).toLocaleString('pt-BR')}{result.cache?.hit ? ' · resultado em cache' : ''}</p></> : <p className="analytics-empty">Escolha os campos e gere a prévia para ver os dados reais.</p>}</div>
  </div>
}
export default function AnalyticsEditor(props: Props) {
  const { widget, charts, pending, errors, onDataset, onSave, onCancel, catalog, catalogLoading, catalogError, retryCatalog } = props
  const [mode, setMode] = useState<'catalog' | 'ready'>(!widget || widget.datasetId === 'custom' ? 'catalog' : 'ready')
  const [datasetId, setDatasetId] = useState(widget?.datasetId !== 'custom' && widget?.datasetId || analyticsCatalog[0].id)
  const source = analyticsCatalog.find(item => item.id === datasetId) || analyticsCatalog[0]
  const [title, setTitle] = useState(widget?.title || 'Meu gráfico')
  const [kind, setKind] = useState<ChartKind>(widget?.type || source.types[0])
  const effectiveKind = source.types.includes(kind) ? kind : source.types[0]
  const chart = charts[source.view]?.charts[source.index]
  return <section className="analytics-editor" aria-labelledby="chart-editor-title">
    <header className="analytics-editor-heading"><h2 id="chart-editor-title">{widget ? 'Editar gráfico' : 'Criar gráfico'}</h2><button type="button" className="analytics-icon-button" aria-label="Fechar editor" onClick={onCancel}><AstroIcon name="close" /></button></header>
    <div className="analytics-editor-modes" aria-label="Modo de criação"><button type="button" aria-pressed={mode === 'catalog'} onClick={() => { setMode('catalog'); onDataset(null) }}>Montar meu cálculo</button><button type="button" aria-pressed={mode === 'ready'} onClick={() => { setMode('ready'); onDataset(source.view) }}>Usar indicador pronto</button></div>
    {mode === 'catalog' ? catalogLoading ? <p role="status" className="analytics-empty">Carregando as bases e os campos disponíveis…</p> : catalogError || !catalog ? <div className="analytics-feedback"><p role="alert">{catalogError || 'Catálogo indisponível.'}</p><button type="button" className="analytics-secondary" onClick={retryCatalog}>Tentar novamente</button></div> : <CatalogEditor widget={widget} title={title} setTitle={setTitle} catalog={catalog} filters={props.filters} workspaceId={props.workspaceId} onSave={onSave} onCancel={onCancel} /> : <div className="analytics-editor-layout">
      <form className="analytics-editor-form" onSubmit={event => { event.preventDefault(); if (title.trim()) onSave({ id: widget?.id || crypto.randomUUID(), datasetId, title: title.trim(), type: effectiveKind, width: 'half' }) }}>
        <label>Nome do gráfico<input autoFocus maxLength={120} required value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>Indicador<select value={datasetId} onChange={event => { const item = analyticsCatalog.find(entry => entry.id === event.target.value)!; setDatasetId(item.id); setTitle(item.label); setKind(item.types[0]); onDataset(item.view) }}>{analyticsCatalog.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <div className="analytics-grouping"><span>Agrupamento disponível</span><strong>{source.grouping}</strong></div><KindOptions kinds={source.types} value={effectiveKind} onChange={setKind} /><p className="analytics-note">O gráfico usa o período selecionado nesta visão.</p>
        <div className="analytics-actions"><button type="button" className="analytics-secondary" onClick={onCancel}>Cancelar</button><button type="submit" className="analytics-primary" disabled={!title.trim()}>{widget ? 'Aplicar alteração' : 'Adicionar à visão'}</button></div>
      </form>
      <div className="analytics-editor-preview"><h3>Prévia · {title || source.label}</h3>{pending ? <p role="status" className="analytics-empty">Consultando dados…</p> : errors[source.view] ? <p role="alert" className="analytics-feedback">{errors[source.view]}</p> : chart ? <AnalyticsChart chart={chart} kind={effectiveKind} /> : <p className="analytics-empty">Escolha um indicador para visualizar os dados.</p>}</div>
    </div>}
  </section>
}
