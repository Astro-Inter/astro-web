import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AstroIcon } from '../../components'
import { useAuthentication } from '../../hooks/useAuthentication'
import { useAnalyticsData } from '../../hooks/useAnalyticsData'
import { useExplorerCatalog, useExplorerData } from '../../hooks/useExplorerData'
import { analyticsCatalog, defaultAnalyticsFilters, templateWidgets, validAnalyticsFilters } from '../../data/dashboardCatalog'
import { loadAnalyticsIdentity } from '../../services/dashboards'
import { loadSavedDashboards, removeDashboard, saveDashboard, subscribeSavedDashboards } from '../../services/dashboardStorage'
import type { AnalyticsFilters, AnalyticsIdentity, AnalyticsView, AnalyticsWidget, DashboardDraft, SavedDashboard } from '../../types/dashboard'
import AnalyticsChart from '../../components/analyticsChart'
import AnalyticsEditor from '../../components/analyticsEditor'

const number = new Intl.NumberFormat('pt-BR')
function template(view: AnalyticsView, filters = defaultAnalyticsFilters()): DashboardDraft {
  return { name: view === 'visao-geral' ? 'Visão geral' : 'Eventos', config: { filters, widgets: templateWidgets(view) } }
}
function WorkspaceDashboards({ identity }: { identity: AnalyticsIdentity }) {
  const [draft, setDraft] = useState<DashboardDraft>(() => template('visao-geral'))
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft))
  const [filters, setFilters] = useState<AnalyticsFilters>(draft.config.filters)
  const [templateView, setTemplateView] = useState<AnalyticsView | null>('visao-geral')
  const [selected, setSelected] = useState<SavedDashboard | null>(null)
  const [saved, setSaved] = useState<SavedDashboard[]>([])
  const [savedError, setSavedError] = useState('')
  const [savedLoading, setSavedLoading] = useState(true)
  const [savedAttempt, setSavedAttempt] = useState(0)
  const [editing, setEditing] = useState(false)
  const [editor, setEditor] = useState<AnalyticsWidget | null | undefined>(undefined)
  const [editorView, setEditorView] = useState<AnalyticsView | null>('visao-geral')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [dragging, setDragging] = useState<string | null>(null)
  const mutation = useRef<AbortController | null>(null)
  const dirty = editing && JSON.stringify(draft) !== baseline
  const filtersChanged = JSON.stringify(filters) !== JSON.stringify(draft.config.filters)
  const sources = draft.config.widgets.flatMap(widget => analyticsCatalog.find(item => item.id === widget.datasetId)?.view || [])
  if (templateView) sources.push(templateView)
  if (editor !== undefined && editorView) sources.push(editorView)
  const data = useAnalyticsData(sources, draft.config.filters, identity.workspaceId, attempt)
  const custom = useExplorerData(draft.config.widgets, draft.config.filters, identity.workspaceId, attempt)
  const catalog = useExplorerCatalog()

  useEffect(() => {
    const controller = new AbortController()
    setSavedLoading(true); setSavedError('')
    loadSavedDashboards(identity, controller.signal).then(items => {
      if (!controller.signal.aborted) { setSaved(items); setSavedLoading(false) }
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) { setSavedError(failure instanceof Error ? failure.message : 'Não foi possível carregar as visões salvas.'); setSavedLoading(false) }
    })
    return () => controller.abort()
  }, [identity, savedAttempt])
  useEffect(() => subscribeSavedDashboards(identity, () => setSavedAttempt(value => value + 1)), [identity])
  useEffect(() => () => mutation.current?.abort(), [])
  useEffect(() => {
    if (!dirty && editor === undefined) return
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty, editor])

  function canLeave() { return !busy && ((!dirty && editor === undefined) || window.confirm('Descartar as alterações não salvas desta visão?')) }
  function openDraft(next: DashboardDraft, view: AnalyticsView | null, item: SavedDashboard | null = null, edit = false) {
    if (!canLeave()) return
    setDraft(next); setBaseline(JSON.stringify(next)); setFilters(next.config.filters)
    setTemplateView(view); setSelected(item); setEditing(edit); setEditor(undefined); setError(''); setFeedback('')
  }
  function beginEdit() { setBaseline(JSON.stringify(draft)); setEditing(true); setFeedback('') }
  function updateWidget(widget: AnalyticsWidget) {
    setDraft(current => ({ ...current, config: { ...current.config, widgets: current.config.widgets.some(w => w.id === widget.id) ? current.config.widgets.map(w => w.id === widget.id ? widget : w) : [...current.config.widgets, widget] } }))
    setEditor(undefined); setFeedback('Gráfico atualizado no rascunho. Salve a visão para guardar as alterações.')
  }
  function moveWidget(id: string, targetIndex: number) {
    if (busy || editor !== undefined) return
    setDraft(current => {
      const widgets = [...current.config.widgets], sourceIndex = widgets.findIndex(w => w.id === id)
      if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= widgets.length) return current
      const [widget] = widgets.splice(sourceIndex, 1); widgets.splice(targetIndex, 0, widget)
      return { ...current, config: { ...current.config, widgets } }
    })
  }
  async function persist() {
    if (busy || filtersChanged || !draft.name.trim()) return
    setBusy(true); setError(''); setFeedback('')
    const controller = new AbortController(); mutation.current = controller
    try {
      const result = await saveDashboard({ ...draft, name: draft.name.trim() }, selected, identity, controller.signal)
      if (controller.signal.aborted) return
      setSaved(items => [result, ...items.filter(item => item.id !== result.id)])
      setSelected(result); setDraft({ name: result.name, config: result.config }); setBaseline(JSON.stringify({ name: result.name, config: result.config }))
      setTemplateView(null); setEditing(false); setEditor(undefined); setSavedError(''); setFeedback('Visão salva neste navegador para sua conta e workspace.')
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Não foi possível salvar a visão.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  async function remove() {
    if (!selected || busy || !window.confirm(`Excluir a visão “${selected.name}”? Esta ação remove somente a configuração salva, sem alterar os dados dos gráficos.`)) return
    const controller = new AbortController(); mutation.current = controller; setBusy(true); setError('')
    try {
      await removeDashboard(selected, identity, controller.signal)
      if (controller.signal.aborted) return
      setSaved(items => items.filter(item => item.id !== selected.id))
      const next = template('visao-geral', draft.config.filters)
      setSelected(null); setDraft(next); setBaseline(JSON.stringify(next)); setTemplateView('visao-geral'); setEditing(false); setEditor(undefined); setFeedback('Visão excluída.')
    } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Não foi possível excluir a visão.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  const metrics = templateView && !editing ? data.results[templateView]?.kpis : undefined
  const results = [...Object.values(data.results), ...Object.values(custom.results)]
  const updated = results.map(result => result?.generatedAt).filter(Boolean).sort()[0]
  const cacheHit = results.some(result => result?.cache?.hit)
  return <>
    <Link className="analytics-back" to="/mainHomeScreen" onClick={event => { if (!canLeave()) event.preventDefault() }}><AstroIcon name="back" />Voltar para a Home</Link>
    <header className="analytics-heading"><div><h1 id="dashboards-title">Dashboards</h1><p>Acompanhe seus indicadores e monte as visões que fazem sentido para sua equipe.</p></div></header>
    <nav className="analytics-navigation" aria-label="Visões de dashboards">
      <div className="analytics-tabs">{(['visao-geral', 'eventos'] as const).map(view => <button type="button" disabled={busy} key={view} aria-pressed={templateView === view} onClick={() => openDraft(template(view, draft.config.filters), view)}>{view === 'visao-geral' ? 'Visão geral' : 'Eventos'}</button>)}</div>
      <button type="button" className="analytics-primary" disabled={busy} onClick={() => openDraft({ name: 'Minha visão', config: { filters: draft.config.filters, widgets: [] } }, null, null, true)}><AstroIcon name="plus" />Nova visão</button>
    </nav>
    {!!saved.length && <nav className="analytics-personal-tabs" aria-label="Visões salvas">{saved.map(item => <button type="button" key={item.id} disabled={busy || savedLoading} aria-pressed={selected?.id === item.id} onClick={() => openDraft({ name: item.name, config: structuredClone(item.config) }, null, item)}>{item.name}</button>)}</nav>}
    {savedError && <div className="analytics-feedback analytics-feedback--subtle" role="status"><p>Suas visões salvas não foram carregadas. {savedError}</p><button type="button" onClick={() => setSavedAttempt(n => n + 1)}>Tentar novamente</button></div>}
    <form className="analytics-filters" onSubmit={event => {
      event.preventDefault(); if (!validAnalyticsFilters(filters)) { setError('Informe datas válidas, com início anterior ao fim e intervalo de até 366 dias.'); return }
      setDraft(current => ({ ...current, config: { ...current.config, filters: { ...filters } } })); if (selected) setEditing(true); setError(''); setEditor(undefined)
    }}><fieldset disabled={busy || editor !== undefined}>
      <label>De<input type="date" required value={filters.start} onChange={event => setFilters({ ...filters, start: event.target.value })} /></label>
      <label>Até<input type="date" required value={filters.end} min={filters.start} onChange={event => setFilters({ ...filters, end: event.target.value })} /></label>
      <label>Granularidade<select value={filters.granularity} onChange={event => setFilters({ ...filters, granularity: event.target.value as AnalyticsFilters['granularity'] })}><option value="dia">Diária</option><option value="semana">Semanal</option><option value="mes">Mensal</option><option value="ano">Anual</option></select></label>
      <button type="submit" className="analytics-secondary">Aplicar filtros</button><button type="button" className="analytics-icon-button" aria-label="Atualizar dados" title="Consultar o Databricks sem usar o cache" onClick={() => setAttempt(n => n + 1)} disabled={data.pending || custom.pending}><AstroIcon name="reload" /></button>
    </fieldset>{filtersChanged && <span className="analytics-note">Aplique os filtros para atualizar os gráficos.</span>}</form>
    <div className="analytics-view-heading">
      {editing ? <label className="analytics-view-name">Nome da visão<input maxLength={120} value={draft.name} disabled={busy} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label> : <div><h2>{draft.name}</h2>{updated && <p className="analytics-note">Consultado em {new Date(updated).toLocaleString('pt-BR')}{cacheHit ? ' · dados em cache' : ''}</p>}</div>}
      <div className="analytics-actions">{editing ? <>
        {dirty && <span className="analytics-unsaved">Alterações não salvas</span>}
        <button type="button" className="analytics-secondary" disabled={busy} onClick={() => { const previous = JSON.parse(baseline) as DashboardDraft; setDraft(previous); setFilters(previous.config.filters); setEditor(undefined); setEditing(false); setError(''); setFeedback('') }}>Cancelar edição</button>
        <button type="button" className="analytics-primary" onClick={() => void persist()} disabled={busy || filtersChanged || !draft.name.trim() || editor !== undefined}>{busy ? 'Salvando…' : selected ? 'Salvar alterações' : 'Salvar visão'}</button>
      </> : <><button type="button" className="analytics-secondary" onClick={beginEdit}><AstroIcon name="pencil" />{selected ? 'Editar visão' : 'Personalizar visão'}</button>{selected && <button type="button" className="analytics-icon-button analytics-danger" onClick={() => void remove()} disabled={busy} aria-label={`Excluir visão ${selected.name}`}><AstroIcon name="trash" /></button>}</>}</div>
    </div>
    {feedback && <p role="status" className="analytics-success">{feedback}</p>}{error && <p role="alert" className="analytics-feedback">{error}</p>}
    {metrics && <div className="analytics-kpis">{metrics.map(metric => <article key={metric.key}><span>{metric.label}</span><strong>{number.format(metric.value)}</strong>{!metric.dateSensitive && <small>Estado disponível</small>}</article>)}</div>}
    {editing && <div className="analytics-edit-toolbar"><p>Adicione até 12 gráficos. Arraste para reorganizar ou use as setas de cada gráfico.</p><button type="button" className="analytics-secondary" disabled={busy || draft.config.widgets.length >= 12 || editor !== undefined} onClick={() => { setEditor(null); setEditorView(null); setFeedback('') }}><AstroIcon name="plus" />Adicionar gráfico</button></div>}
    {editor !== undefined && <AnalyticsEditor key={editor?.id || 'new'} widget={editor} charts={data.results} errors={data.errors} pending={data.pending} onDataset={setEditorView} onCancel={() => setEditor(undefined)} onSave={updateWidget} filters={draft.config.filters} workspaceId={identity.workspaceId} catalog={catalog.catalog} catalogLoading={catalog.loading} catalogError={catalog.error} retryCatalog={catalog.retry} />}
    {!draft.config.widgets.length && editor === undefined && <section className="analytics-no-widgets"><AstroIcon name="report" /><h3>Sua visão começa com um gráfico</h3><p>Escolha um indicador, o tipo de visualização e organize seus dados aqui.</p>{editing && <button type="button" className="analytics-primary" onClick={() => { setEditor(null); setEditorView(null) }}>Criar primeiro gráfico</button>}</section>}
    <div className="analytics-widget-grid" aria-busy={data.pending || custom.pending}>
      {draft.config.widgets.map((widget, index) => {
        const source = analyticsCatalog.find(item => item.id === widget.datasetId)
        const isCustom = widget.datasetId === 'custom'
        if (!source && !isCustom) return null
        const result = isCustom ? custom.results[widget.id] : data.results[source!.view]
        const chart = isCustom ? custom.results[widget.id]?.chart : data.results[source!.view]?.charts[source!.index]
        const failure = isCustom ? custom.errors[widget.id] : data.errors[source!.view]
        const pending = isCustom ? custom.pending && !chart && !failure : data.pending
        return <section key={widget.id} className={`analytics-widget analytics-widget--${widget.width}${dragging === widget.id ? ' analytics-widget--dragging' : ''}`} aria-label={widget.title} onDragOver={event => { if (editing && dragging) event.preventDefault() }} onDrop={event => { event.preventDefault(); if (editing && dragging) moveWidget(dragging, index); setDragging(null) }}>
          <header><h3>{widget.title}</h3>{editing && <div className="analytics-widget-actions">
            <button type="button" className="analytics-icon-button" disabled={busy || editor !== undefined} draggable={!busy && editor === undefined} onDragStart={event => { event.dataTransfer.setData('text/plain', widget.id); event.dataTransfer.effectAllowed = 'move'; setDragging(widget.id) }} onDragEnd={() => setDragging(null)} aria-label={`Arrastar ${widget.title}`} title="Arrastar para reorganizar"><AstroIcon name="distribution" /></button>
            <button type="button" className="analytics-icon-button analytics-move-up" disabled={busy || index === 0} onClick={() => moveWidget(widget.id, index - 1)} aria-label={`Mover ${widget.title} para antes`}><AstroIcon name="chevron-left" /></button>
            <button type="button" className="analytics-icon-button analytics-move-down" disabled={busy || index === draft.config.widgets.length - 1} onClick={() => moveWidget(widget.id, index + 1)} aria-label={`Mover ${widget.title} para depois`}><AstroIcon name="chevron-right" /></button>
            <button type="button" className="analytics-icon-button" disabled={busy || editor !== undefined} onClick={() => { setEditor(widget); setEditorView(source?.view || null) }} aria-label={`Editar ${widget.title}`}><AstroIcon name="pencil" /></button>
            <button type="button" className="analytics-icon-button analytics-danger" disabled={busy || editor !== undefined} onClick={() => setDraft(current => ({ ...current, config: { ...current.config, widgets: current.config.widgets.filter(w => w.id !== widget.id) } }))} aria-label={`Remover ${widget.title}`}><AstroIcon name="trash" /></button>
          </div>}</header>
          {pending ? <div className="analytics-loading-chart" role="status"><span />Consultando dados…</div> : failure ? <div className="analytics-widget-error"><p role="alert">{failure}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button></div> : chart ? <AnalyticsChart chart={chart} kind={widget.type} /> : <p role="status" className="analytics-empty">Não foi possível encontrar os dados deste indicador.</p>}
          {result && <small className="analytics-widget-cache">Consultado às {new Date(result.generatedAt).toLocaleTimeString('pt-BR')}{result.cache?.hit ? ' · resultado em cache por até 90 s' : ''}</small>}
        </section>
      })}
    </div>
    <footer className="analytics-footer">Suas visões ficam salvas somente neste navegador. Limpar os dados do site remove essas configurações. Os resultados podem ser reutilizados por até 90 segundos; use Atualizar dados para consultar a fonte novamente.</footer>
  </>
}

export default function MainDashboardsScreenPage() {
  const { user } = useAuthentication()
  const uid = user?.uid || ''
  const [attempt, setAttempt] = useState(0)
  const key = `${uid}/${attempt}`
  const [access, setAccess] = useState<{ key: string; identity?: AnalyticsIdentity; error?: string }>({ key: '' })
  useEffect(() => {
    const controller = new AbortController()
    if (uid) loadAnalyticsIdentity(controller.signal).then(identity => { if (!controller.signal.aborted) setAccess({ key, identity }) }).catch((error: unknown) => { if (!controller.signal.aborted) setAccess({ key, error: error instanceof Error ? error.message : 'Não foi possível confirmar seu workspace.' }) })
    return () => controller.abort()
  }, [uid, key])
  const identity = access.key === key ? access.identity : undefined, error = access.key === key ? access.error : undefined
  return <div className="analytics-page"><main className="analytics-main" id="conteudo-principal" data-track-page={true}>
    <section className="position-content analytics-content astro-scale-90" aria-labelledby="dashboards-title">
      {identity ? <WorkspaceDashboards key={`${uid}/${identity.userId}/${identity.workspaceId}`} identity={identity} /> : <><Link className="analytics-back" to="/mainHomeScreen"><AstroIcon name="back" />Voltar para a Home</Link><header className="analytics-heading"><div><h1 id="dashboards-title">Dashboards</h1><p>Indicadores e visões da sua equipe.</p></div></header>{error ? <div className="analytics-feedback"><p role="alert">{error}</p><button type="button" className="analytics-secondary" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button></div> : <div className="analytics-access-loading" role="status">Confirmando seu acesso…</div>}</>}
    </section>
  </main></div>
}
