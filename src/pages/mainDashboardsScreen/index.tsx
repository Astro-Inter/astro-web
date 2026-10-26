import { useEffect, useRef, useState } from 'react'
import { AstroIcon } from '../../components'
import { useAuthentication } from '../../hooks/useAuthentication'
import { useAnalyticsData } from '../../hooks/useAnalyticsData'
import { useExplorerCatalog, useExplorerData } from '../../hooks/useExplorerData'
import { analyticsCatalog, defaultAnalyticsFilters, templateWidgets, validAnalyticsFilters } from '../../data/dashboardCatalog'
import { loadAnalyticsIdentity } from '../../services/dashboards'
import { loadSavedDashboards, removeDashboard, saveDashboard, subscribeSavedDashboards } from '../../services/dashboardStorage'
import type { AnalyticsFilters, AnalyticsIdentity, AnalyticsView, AnalyticsWidget, DashboardDraft, SavedDashboard } from '../../types/dashboard'
import AnalyticsChart from '../../components/analyticsChart'
import AnalyticsLoadingContent from '../../components/analyticsLoadingContent'
import AnalyticsEditorModal from '../../components/analyticsEditorModal'
import DashboardViewModal from '../../components/dashboardViewModal'
import AnalyticsPageLayout from '../../components/analyticsPageLayout'
import PurpleButton from '../../components/purpleButton'
import ToolbarSelect from '../../components/toolbarSelect'
import ActionLoading from '../../components/actionLoading'
import FormDatePicker from '../../components/formDatePicker'
import { useActionFeedback } from '../../hooks/useActionFeedback'

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
  const [newViewOpen, setNewViewOpen] = useState(false)
  const newViewTrigger = useRef<HTMLButtonElement | null>(null)
  const [editor, setEditor] = useState<AnalyticsWidget | null | undefined>(undefined)
  const [editorView, setEditorView] = useState<AnalyticsView | null>('visao-geral')
  const [busy, setBusy] = useState(false)
  const setFeedback = useActionFeedback()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [dragging, setDragging] = useState<string | null>(null)
  const mutation = useRef<AbortController | null>(null)
  const editorTrigger = useRef<HTMLButtonElement | null>(null)
  const initialSelection = useRef(true)
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
      if (!controller.signal.aborted) {
        setSaved(items); setSavedLoading(false)
        if (initialSelection.current) {
          initialSelection.current = false
          const overview = items.find(item => item.name.trim().toLocaleLowerCase('pt-BR') === 'visão geral')
          if (overview) {
            const next = { name: overview.name, config: structuredClone(overview.config) }
            setSelected(overview); setDraft(next); setBaseline(JSON.stringify(next)); setFilters(next.config.filters); setTemplateView(null)
          }
        }
      }
    }).catch((failure: unknown) => {
      if (!controller.signal.aborted) { setSavedError(failure instanceof Error ? failure.message : 'Não foi possível carregar as visões salvas.'); setSavedLoading(false) }
    })
    return () => controller.abort()
  }, [identity, savedAttempt])
  useEffect(() => subscribeSavedDashboards(identity, () => setSavedAttempt(value => value + 1)), [identity])
  useEffect(() => () => mutation.current?.abort(), [])
  useEffect(() => {
    if (!dirty && editor === undefined && !busy && !newViewOpen) return
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty, editor, busy, newViewOpen])

  function canLeave() { return !busy && ((!dirty && editor === undefined) || window.confirm('Descartar as alterações não salvas desta visão?')) }
  function openDraft(next: DashboardDraft, view: AnalyticsView | null, item: SavedDashboard | null = null, edit = false) {
    if (!canLeave()) return
    initialSelection.current = false
    setDraft(next); setBaseline(JSON.stringify(next)); setFilters(next.config.filters)
    setTemplateView(view); setSelected(item); setEditing(edit); setEditor(undefined); setError(''); setFeedback('')
  }
  function beginEdit() { initialSelection.current = false; setBaseline(JSON.stringify(draft)); setEditing(true); setFeedback('') }
  function reportFailure(failure: unknown) {
    if (failure instanceof DOMException && failure.name === 'AbortError') return
    setFeedback(failure instanceof Error ? failure.message : 'Não foi possível salvar a alteração.', 'error')
  }
  function openEditor(widget: AnalyticsWidget | null, trigger: HTMLButtonElement) {
    editorTrigger.current = trigger
    setEditor(widget)
    setEditorView(widget ? analyticsCatalog.find(item => item.id === widget.datasetId)?.view ?? null : null)
  }
  function closeEditor() {
    setEditor(undefined)
    requestAnimationFrame(() => editorTrigger.current?.isConnected && editorTrigger.current.focus())
  }
  async function persist(next: DashboardDraft, message: string, existing: SavedDashboard | null = selected) {
    if (mutation.current) throw new Error('Aguarde a alteração em andamento.')
    if (!next.name.trim()) throw new Error('Informe o nome da visão antes de continuar.')
    if (!validAnalyticsFilters(next.config.filters)) throw new Error('Confira o período da visão antes de continuar.')
    const controller = new AbortController(); mutation.current = controller
    setBusy(true); setError('')
    try {
      const result = await saveDashboard({ ...next, name: next.name.trim() }, existing, identity, controller.signal)
      controller.signal.throwIfAborted()
      const stored = { name: result.name, config: result.config }
      setSaved(items => [result, ...items.filter(item => item.id !== result.id)])
      setSelected(result); setDraft(stored); setBaseline(JSON.stringify(stored))
      setFilters(current => JSON.stringify(current) === JSON.stringify(draft.config.filters) ? result.config.filters : current); setTemplateView(null); setSavedError(''); setFeedback(message)
    } finally {
      if (mutation.current === controller) mutation.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  async function updateWidget(widget: AnalyticsWidget) {
    const exists = draft.config.widgets.some(item => item.id === widget.id)
    const widgets = exists ? draft.config.widgets.map(item => item.id === widget.id ? widget : item) : [...draft.config.widgets, widget]
    await persist({ ...draft, config: { ...draft.config, widgets } }, exists ? 'Gráfico atualizado com sucesso.' : 'Gráfico adicionado com sucesso.')
  }
  function moveWidget(id: string, targetIndex: number) {
    if (busy || editor !== undefined) return
    const widgets = [...draft.config.widgets], sourceIndex = widgets.findIndex(widget => widget.id === id)
    if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= widgets.length) return
    const [widget] = widgets.splice(sourceIndex, 1); widgets.splice(targetIndex, 0, widget)
    void persist({ ...draft, config: { ...draft.config, widgets } }, 'Ordem dos gráficos atualizada.').catch(reportFailure)
  }
  function removeWidget(id: string) {
    if (busy || editor !== undefined) return
    void persist({ ...draft, config: { ...draft.config, widgets: draft.config.widgets.filter(widget => widget.id !== id) } }, 'Gráfico removido com sucesso.').catch(reportFailure)
  }
  function saveName() {
    if (busy || !dirty || editor !== undefined) return
    void persist(draft, 'Nome da visão atualizado.').catch(reportFailure)
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
    finally { if (mutation.current === controller) mutation.current = null; if (!controller.signal.aborted) setBusy(false) }
  }
  const defaultViewOptions = [{ value: 'visao-geral', label: 'Visão geral' }, { value: 'eventos', label: 'Eventos' }].map(option => {
    const item = saved.find(item => item.name.trim().toLocaleLowerCase('pt-BR') === option.label.toLocaleLowerCase('pt-BR'))
    return item ? { value: `saved:${item.id}`, label: item.name } : option
  })
  const metrics = templateView && !editing ? data.results[templateView]?.kpis : undefined
  const results = [...Object.values(data.results), ...Object.values(custom.results)]
  const updated = results.map(result => result?.generatedAt).filter(Boolean).sort()[0]
  const cacheHit = results.some(result => result?.cache?.hit)
  return <AnalyticsPageLayout onBack={event => { if (!canLeave()) event.preventDefault() }}>
    <ActionLoading active={busy} />
    <header className="analytics-heading"><div><h1 id="dashboards-title">Dashboards</h1></div></header>
    <nav className="analytics-navigation" aria-label="Visões de dashboards">
      <div className="analytics-view-selector"><span className="create-forms-label">Visão do dashboard</span>
        <AnalyticsLoadingContent loading={savedLoading} variant="select" label="Carregando visões salvas"><ToolbarSelect className="create-forms-select" id="analytics-view" label="Visão do dashboard" disabled={busy || savedLoading} closeOnPageScroll={false}
          value={selected ? `saved:${selected.id}` : templateView ?? 'custom'}
          options={[...defaultViewOptions, ...saved.filter(item => !defaultViewOptions.some(option => option.value === `saved:${item.id}`)).map(item => ({ value: `saved:${item.id}`, label: item.name })), ...(!selected && !templateView ? [{ value: 'custom', label: draft.name || 'Minha visão' }] : [])]}
          onValueChange={value => {
            if (value === 'visao-geral' || value === 'eventos') openDraft(template(value, draft.config.filters), value)
            else { const item = saved.find(item => `saved:${item.id}` === value); if (item) openDraft({ name: item.name, config: structuredClone(item.config) }, null, item) }
          }} /></AnalyticsLoadingContent>
      </div>
      <PurpleButton type="button" className="analytics-primary" ref={newViewTrigger} disabled={busy || savedLoading} onClick={() => { if (canLeave()) { initialSelection.current = false; setNewViewOpen(true) } }}><AstroIcon name="plus" />Nova visão</PurpleButton>
    </nav>
    {newViewOpen && <DashboardViewModal existingNames={['Visão geral', 'Eventos', ...saved.map(item => item.name)]} onCreate={async name => {
      await persist({ name, config: { filters: draft.config.filters, widgets: [] } }, 'Visão criada com sucesso.', null)
      setEditing(true)
    }} onClose={() => { setNewViewOpen(false); requestAnimationFrame(() => newViewTrigger.current?.focus({ preventScroll: true })) }} />}
    {savedError && <div className="analytics-feedback analytics-feedback--subtle" role="status"><p>Suas visões salvas não foram carregadas. {savedError}</p><button type="button" onClick={() => setSavedAttempt(n => n + 1)}>Tentar novamente</button></div>}
    <form className="create-forms-card analytics-filters" onSubmit={event => {
      event.preventDefault(); if (!validAnalyticsFilters(filters)) { setError('Informe datas válidas, com início anterior ao fim e intervalo de até 366 dias.'); return }
      const next = { ...draft, config: { ...draft.config, filters: { ...filters } } }; setError('');
      if (selected) void persist(next, 'Filtros atualizados.').catch(reportFailure)
      else { setDraft(next); setBaseline(JSON.stringify(next)) }
    }}><h2>Filtros</h2><fieldset disabled={busy || editor !== undefined}>
      <div className="analytics-filter-field"><span className="create-forms-label">Data inicial</span><FormDatePicker id="analytics-start" label="Data inicial" value={filters.start} validate={false} escapeOverflow onChange={start => setFilters({ ...filters, start })} /></div>
      <div className="analytics-filter-field"><span className="create-forms-label">Data final</span><FormDatePicker id="analytics-end" label="Data final" value={filters.end} validate={false} escapeOverflow onChange={end => setFilters({ ...filters, end })} /></div>
      <div className="analytics-filter-field"><span className="create-forms-label">Granularidade</span><ToolbarSelect className="create-forms-select" id="analytics-granularity" label="Granularidade" searchable={false} closeOnPageScroll={false} disabled={busy || editor !== undefined} value={filters.granularity} onValueChange={value => setFilters({ ...filters, granularity: value as AnalyticsFilters['granularity'] })} options={[{ value: 'dia', label: 'Diária' }, { value: 'semana', label: 'Semanal' }, { value: 'mes', label: 'Mensal' }, { value: 'ano', label: 'Anual' }]} /></div>
      <PurpleButton type="submit" className="analytics-secondary">Aplicar filtros</PurpleButton><span className="create-forms-question-actions analytics-refresh-action"><button type="button" className="analytics-icon-button" aria-label="Atualizar dados" title="Atualizar indicadores" onClick={() => setAttempt(n => n + 1)} disabled={data.pending || custom.pending}><AstroIcon name="reload" /></button></span>
    </fieldset>{filtersChanged && <span className="analytics-note">Aplique os filtros para atualizar os gráficos.</span>}</form>
    <div className="analytics-view-heading" key={editing ? "editing" : "view"}>
      {editing ? <label className="analytics-view-name">Nome da visão<input maxLength={120} value={draft.name} disabled={busy} onBlur={event => { if (!(event.relatedTarget instanceof Element) || !event.relatedTarget.closest('button,a,[role="combobox"]')) saveName() }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); saveName() } }} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label> : <div><h2>{draft.name}</h2>{updated && <p className="analytics-note">Consultado em {new Date(updated).toLocaleString('pt-BR')}{cacheHit ? ' · dados em cache' : ''}</p>}</div>}
      <div className="analytics-actions">{editing ? <>
        <button type="button" className="astro-modal-cancel analytics-cancel" data-analytics-cancel disabled={busy} onClick={() => { const previous = JSON.parse(baseline) as DashboardDraft; setDraft(previous); setFilters(previous.config.filters); setEditor(undefined); setEditing(false); setError(''); setFeedback('') }}>Cancelar edição</button>
        <PurpleButton type="button" className="analytics-secondary" disabled={busy || draft.config.widgets.length >= 12 || editor !== undefined} onClick={event => openEditor(null, event.currentTarget)}><AstroIcon name="plus" />Adicionar gráfico</PurpleButton>
      </> : <><PurpleButton type="button" className="analytics-secondary" onClick={beginEdit}><AstroIcon name="pencil" />{selected ? 'Editar visão' : 'Personalizar visão'}</PurpleButton>{selected && <span className="create-forms-question-actions"><button type="button" className="analytics-icon-button analytics-danger" onClick={() => void remove()} disabled={busy} aria-label={`Excluir visão ${selected.name}`}><AstroIcon name="trash" /></button></span>}</>}</div>
    </div>
    {error && <p role="alert" className="analytics-feedback">{error}</p>}
    {templateView && !editing && <div className="analytics-kpis">{Array.from({ length: data.pending ? 4 : metrics?.length ?? 0 }, (_, slot) => {
      const metric = metrics?.[slot]
      return <article className="create-forms-card" key={`metric-${slot}`}><AnalyticsLoadingContent loading={data.pending} variant="metric" contentKey={metric?.key} label="Carregando indicador">{metric && <><span>{metric.label}</span><strong>{number.format(metric.value)}</strong>{!metric.dateSensitive && <small>Estado disponível</small>}</>}</AnalyticsLoadingContent></article>
    })}</div>}
    {editing && <p className="analytics-note">Adicione até 12 gráficos. As alterações confirmadas nos popups são salvas automaticamente.</p>}
    {editor !== undefined && <AnalyticsEditorModal key={editor?.id || 'new'} widget={editor} charts={data.results} errors={data.errors} pending={data.pending} onDataset={setEditorView} onClose={closeEditor} onSave={updateWidget} filters={draft.config.filters} workspaceId={identity.workspaceId} catalog={catalog.catalog} catalogLoading={catalog.loading} catalogError={catalog.error} retryCatalog={catalog.retry} />}
    {!draft.config.widgets.length && editor === undefined && <section className="analytics-no-widgets"><AstroIcon name="report" /><h3>Sua visão começa com um gráfico</h3><p>Escolha um indicador, o tipo de visualização e organize seus dados aqui.</p>{editing && <PurpleButton type="button" className="analytics-primary" onClick={event => openEditor(null, event.currentTarget)}>Criar primeiro gráfico</PurpleButton>}</section>}
    <div className="analytics-widget-grid" aria-busy={data.pending || custom.pending}>
      {draft.config.widgets.map((widget, index) => {
        const source = analyticsCatalog.find(item => item.id === widget.datasetId)
        const isCustom = widget.datasetId === 'custom'
        if (!source && !isCustom) return null
        const result = isCustom ? custom.results[widget.id] : data.results[source!.view]
        const chart = isCustom ? custom.results[widget.id]?.chart : data.results[source!.view]?.charts[source!.index]
        const failure = isCustom ? custom.errors[widget.id] : data.errors[source!.view]
        const pending = isCustom ? custom.pending && !chart && !failure : data.pending
        return <section key={widget.id} className={`create-forms-card create-forms-question-card analytics-widget analytics-widget--${widget.width}${dragging === widget.id ? ' analytics-widget--dragging' : ''}`} aria-label={widget.title} onDragOver={event => { if (editing && dragging) event.preventDefault() }} onDrop={event => { event.preventDefault(); if (editing && dragging) moveWidget(dragging, index); setDragging(null) }}>
          <header><h3>{widget.title}</h3>{editing && <div className="create-forms-question-actions analytics-widget-actions">
            <button type="button" className="analytics-icon-button" disabled={busy || editor !== undefined} draggable={!busy && editor === undefined} onDragStart={event => { event.dataTransfer.setData('text/plain', widget.id); event.dataTransfer.effectAllowed = 'move'; setDragging(widget.id) }} onDragEnd={() => setDragging(null)} aria-label={`Arrastar ${widget.title}`} title="Arrastar para reorganizar"><AstroIcon name="distribution" /></button>
            <button type="button" className="analytics-icon-button analytics-move-up" disabled={busy || index === 0} onClick={() => moveWidget(widget.id, index - 1)} aria-label={`Mover ${widget.title} para antes`}><AstroIcon name="chevron-left" /></button>
            <button type="button" className="analytics-icon-button analytics-move-down" disabled={busy || index === draft.config.widgets.length - 1} onClick={() => moveWidget(widget.id, index + 1)} aria-label={`Mover ${widget.title} para depois`}><AstroIcon name="chevron-right" /></button>
            <button type="button" className="analytics-icon-button" disabled={busy || editor !== undefined} onClick={event => openEditor(widget, event.currentTarget)} aria-label={`Editar ${widget.title}`}><AstroIcon name="pencil" /></button>
            <button type="button" className="analytics-icon-button analytics-danger" disabled={busy || editor !== undefined} onClick={() => removeWidget(widget.id)} aria-label={`Remover ${widget.title}`}><AstroIcon name="trash" /></button>
          </div>}</header>
          <AnalyticsLoadingContent loading={pending} contentKey={JSON.stringify([widget.type, chart, failure])}>{failure ? <div className="analytics-widget-error"><p role="alert">{failure}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button></div> : chart ? <AnalyticsChart chart={chart} kind={widget.type} /> : <p role="status" className="analytics-empty">Não foi possível encontrar os dados deste indicador.</p>}</AnalyticsLoadingContent>
          {result && <small className="analytics-widget-cache">Consultado às {new Date(result.generatedAt).toLocaleTimeString('pt-BR')}{result.cache?.hit ? ' · resultado em cache por até 90 s' : ''}</small>}
        </section>
      })}
    </div>
    <footer className="analytics-footer">Suas visões ficam salvas somente neste navegador. Limpar os dados do site remove essas configurações. Os resultados podem ser reutilizados por até 90 segundos; use Atualizar dados para consultar a fonte novamente.</footer>
  </AnalyticsPageLayout>
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
  if (!identity && !error) return <div className="create-forms-page astro-scale-90" aria-busy="true"><ActionLoading /></div>
  if (identity) return <WorkspaceDashboards key={`${uid}/${identity.userId}/${identity.workspaceId}`} identity={identity} />
  return <AnalyticsPageLayout>
    <header className="analytics-heading"><div><h1 id="dashboards-title">Dashboards</h1><p>Indicadores e visões da sua equipe.</p></div></header>
    <section className="create-forms-card analytics-feedback"><h2>Não foi possível abrir o dashboard</h2><p role="alert">{error}</p><PurpleButton type="button" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</PurpleButton></section>
  </AnalyticsPageLayout>
}
