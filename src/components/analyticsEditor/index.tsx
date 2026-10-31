import { useId, useState } from 'react'
import { analyticsCatalog } from '../../data/dashboardCatalog'
import type { AnalyticsFilters, AnalyticsView, AnalyticsWidget, AnalyticsChart as Chart, ChartKind, ExplorerCatalog } from '../../types/dashboard'
import { validateChartTitle } from '../../utils/dashboardQuery'
import CatalogEditor from '../analyticsCatalogEditor'
import AnalyticsChart from '../analyticsChart'
import AnalyticsEditorSelect from '../analyticsEditorSelect'
import AnalyticsEditorSkeleton from '../analyticsEditorSkeleton'
import AnalyticsIndicatorGuide from '../analyticsIndicatorGuide'
import KindOptions from '../analyticsKindOptions'
import AnalyticsLoadingContent from '../analyticsLoadingContent'
import AnimatedFieldError from '../animatedFieldError'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'
import TruncatedText from '../truncatedText'

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
export default function AnalyticsEditor(props: Props) {
  const formId = useId()
  const { widget, charts, pending, errors, onDataset, onSave, onCancel, catalog, catalogLoading, catalogError, retryCatalog } = props
  const [fields, setFields] = useState({ mode: !widget || widget.datasetId === 'custom' ? 'catalog' as const : 'ready' as const, datasetId: widget?.datasetId !== 'custom' && widget?.datasetId || analyticsCatalog[0].id, title: widget?.title || 'Meu gráfico', kind: widget?.type || analyticsCatalog.find(item => item.id === widget?.datasetId)?.types[0] || analyticsCatalog[0].types[0] })
  const { mode, datasetId, title, kind } = fields
  const [nameError, setNameError] = useState('')
  function setMode(mode: 'catalog' | 'ready') { setFields(current => ({ ...current, mode })) }
  function setTitle(title: string) { setFields(current => ({ ...current, title })) }
  function setKind(kind: ChartKind) { setFields(current => ({ ...current, kind })) }
  const source = analyticsCatalog.find(item => item.id === datasetId) || analyticsCatalog[0]
  const effectiveKind = source.types.includes(kind) ? kind : source.types[0]
  const chart = charts[source.view]?.charts[source.index]
  return <section className="create-forms-card analytics-editor" aria-label={props.hideHeading ? 'Configuração do gráfico' : undefined} aria-labelledby={props.hideHeading ? undefined : 'chart-editor-title'}>
    {!props.hideHeading && <header className="analytics-editor-heading"><h2 id="chart-editor-title">{widget ? 'Editar gráfico' : 'Criar gráfico'}</h2><span className="create-forms-question-actions"><button type="button" className="analytics-icon-button" aria-label="Fechar editor" onClick={onCancel}><AstroIcon name="close" /></button></span></header>}
    <div className="analytics-editor-modes"><AnalyticsEditorSelect label="Como deseja criar o gráfico?" value={mode} options={[{ value: 'catalog', label: 'Montar meu cálculo' }, { value: 'ready', label: 'Usar indicador pronto' }]} onChange={value => { const next = value as 'catalog' | 'ready'; setMode(next); onDataset(next === 'ready' ? source.view : null) }} /></div>
    <div className="analytics-mode-content" key={mode}>{mode === 'catalog' ? <AnalyticsLoadingContent loading={catalogLoading} variant="fields" skeleton={<AnalyticsEditorSkeleton title={title} />} label="Carregando as bases e os campos disponíveis…">{catalogError || !catalog ? <div className="analytics-feedback"><p role="alert">{catalogError || 'Catálogo indisponível.'}</p><PurpleButton type="button" className="analytics-secondary" onClick={retryCatalog}>Tentar novamente</PurpleButton></div> : <CatalogEditor widget={widget} title={title} setTitle={setTitle} catalog={catalog} filters={props.filters} workspaceId={props.workspaceId} onSave={onSave} formId={formId} />}</AnalyticsLoadingContent> : <div className="analytics-editor-layout analytics-editor-layout--ready">
      <form id={formId} className="analytics-editor-form" onSubmit={event => { event.preventDefault(); const error = validateChartTitle(title); setNameError(error); if (!error) onSave({ id: widget?.id || crypto.randomUUID(), datasetId, title: title.trim(), type: effectiveKind, width: 'half' }) }}>
        <label htmlFor={`${formId}-title`}>Nome do gráfico<input id={`${formId}-title`} placeholder="Digite o nome do gráfico" maxLength={120} required value={title} aria-invalid={!!nameError} aria-describedby={nameError ? `${formId}-title-error` : undefined} onChange={event => { setNameError(''); setTitle(event.target.value) }} /></label><AnimatedFieldError id={`${formId}-title-error`} message={nameError} />
        <AnalyticsEditorSelect label="Indicador" value={datasetId} onChange={value => { const item = analyticsCatalog.find(entry => entry.id === value)!; setFields(current => ({ ...current, datasetId: item.id, title: item.label, kind: item.types[0] })); onDataset(item.view) }} options={analyticsCatalog.map(item => ({ value: item.id, label: item.label }))} />
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
