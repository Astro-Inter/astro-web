import { useCallback, useEffect, useRef, useState } from 'react'
import { AstroIcon } from '../../components'
import ActionLoading from '../../components/actionLoading'
import AnalyticsChart from '../../components/analyticsChart'
import AnalyticsEditorModal from '../../components/analyticsEditorModal'
import AnalyticsLoadingContent from '../../components/analyticsLoadingContent'
import AnalyticsMetricCard from '../../components/analyticsMetricCard'
import AnalyticsPageLayout from '../../components/analyticsPageLayout'
import ConfirmationModal from '../../components/confirmationModal'
import type { DashboardGalleryItem } from '../../components/dashboardCard'
import DashboardGallery from '../../components/dashboardGallery'
import DashboardViewModal from '../../components/dashboardViewModal'
import FormDatePicker from '../../components/formDatePicker'
import PurpleButton from '../../components/purpleButton'
import ToolbarSelect from '../../components/toolbarSelect'
import TruncatedText from '../../components/truncatedText'
import { analyticsCatalog, defaultAnalyticsFilters, templateWidgets, validAnalyticsFilters } from '../../data/dashboardCatalog'
import { useActionFeedback } from '../../hooks/useActionFeedback'
import { useAnalyticsData } from '../../hooks/useAnalyticsData'
import { useDashboardReorder } from '../../hooks/useDashboardReorder'
import { useExplorerCatalog, useExplorerData } from '../../hooks/useExplorerData'
import { loadSavedDashboards, removeDashboard, saveDashboard, subscribeSavedDashboards } from '../../services/dashboardStorage'
import type { AnalyticsFilters, AnalyticsIdentity, AnalyticsView, AnalyticsWidget, DashboardDraft, SavedDashboard } from '../../types/dashboard'
import { validateAndSanitizeWidget } from '../../utils/dashboardQuery'

function template(view: AnalyticsView, filters = defaultAnalyticsFilters()): DashboardDraft {
  return { name: view === 'visao-geral' ? 'Visão geral' : 'Eventos', config: { filters, widgets: templateWidgets(view) } }
}
interface WorkspaceDashboardsProps { identity: AnalyticsIdentity; initialSaved?: SavedDashboard[] }

function WorkspaceDashboards({ identity, initialSaved }: WorkspaceDashboardsProps) {
  const [draft, setDraft] = useState<DashboardDraft>(() => template('visao-geral'))
  const [baseline, setBaseline] = useState(() => JSON.stringify(draft))
  const [filters, setFilters] = useState<AnalyticsFilters>(draft.config.filters)
  const [templateView, setTemplateView] = useState<AnalyticsView | null>('visao-geral')
  const [selected, setSelected] = useState<SavedDashboard | null>(null)
  const [saved, setSaved] = useState<SavedDashboard[]>(initialSaved ?? [])
  const [savedError, setSavedError] = useState('')
  const [savedLoading, setSavedLoading] = useState(!initialSaved)
  const [savedAttempt, setSavedAttempt] = useState(0)
  const reloadSaved = useCallback(() => { setSavedLoading(true); setSavedError(''); setSavedAttempt(value => value + 1) }, [])
  const [opened, setOpened] = useState(false)
  const galleryTrigger = useRef<HTMLButtonElement | null>(null)
  const galleryScroll = useRef(0)
  const [editing, setEditing] = useState(false)
  const [newViewOpen, setNewViewOpen] = useState(false)
  const [cardEditorOpen, setCardEditorOpen] = useState(false)
  const [cardEditorTarget, setCardEditorTarget] = useState<DashboardGalleryItem | null>(null)
  const cardEditorTrigger = useRef<HTMLButtonElement | null>(null)
  const [pendingDeletion, setPendingDeletion] = useState<SavedDashboard | null>(null)
  const deletionTrigger = useRef<HTMLButtonElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const newViewTrigger = useRef<HTMLButtonElement | null>(null)
  const [editor, setEditor] = useState<AnalyticsWidget | null | undefined>(undefined)
  const [editorView, setEditorView] = useState<AnalyticsView | null>('visao-geral')
  const [busy, setBusy] = useState(false)
  const setFeedback = useActionFeedback()
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const mutation = useRef<AbortController | null>(null)
  const editorTrigger = useRef<HTMLButtonElement | null>(null)
  const initialSelection = useRef(true)
  const dirty = editing && JSON.stringify(draft) !== baseline
  const filtersChanged = JSON.stringify(filters) !== JSON.stringify(draft.config.filters)
  const sources = (opened ? draft.config.widgets : []).flatMap(widget => analyticsCatalog.find(item => item.id === widget.datasetId)?.view || [])
  if (opened && templateView) sources.push(templateView)
  if (editor !== undefined && editorView) sources.push(editorView)
  const data = useAnalyticsData(sources, draft.config.filters, identity.workspaceId, attempt)
  const custom = useExplorerData(opened ? draft.config.widgets : [], draft.config.filters, identity.workspaceId, attempt)
  const catalog = useExplorerCatalog()

  useEffect(() => {
    const controller = new AbortController()
    const request = initialSaved && savedAttempt === 0 ? Promise.resolve(initialSaved) : loadSavedDashboards(identity, controller.signal)
    request.then(items => {
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
  }, [identity, savedAttempt, initialSaved])
  useEffect(() => subscribeSavedDashboards(identity, reloadSaved), [identity, reloadSaved])
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
    setOpened(true); setTemplateView(view); setSelected(item); setEditing(edit); setEditor(undefined); setError(''); setFeedback('')
  }
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
  async function updateWidget(input: AnalyticsWidget) {
    const widget = validateAndSanitizeWidget(input)
    const exists = draft.config.widgets.some(item => item.id === widget.id)
    const widgets = exists ? draft.config.widgets.map(item => item.id === widget.id ? widget : item) : [...draft.config.widgets, widget]
    await persist({ ...draft, config: { ...draft.config, widgets } }, exists ? 'Gráfico atualizado com sucesso.' : 'Gráfico adicionado com sucesso.')
  }
  const { gridRef, dragging, announcement, onPointerDown, moveByKeyboard, renderedWidgets } = useDashboardReorder(draft.config.widgets, !opened || !editing || busy || cardEditorOpen || editor !== undefined, async widgets => {
    try { await persist({ ...draft, config: { ...draft.config, widgets } }, 'Ordem dos gráficos atualizada.') }
    catch (failure) { reportFailure(failure); throw failure }
  })
  function removeWidget(id: string) {
    if (busy || editor !== undefined) return
    void persist({ ...draft, config: { ...draft.config, widgets: draft.config.widgets.filter(widget => widget.id !== id) } }, 'Gráfico removido com sucesso.').catch(reportFailure)
  }
  function saveName() {
    if (busy || !dirty || editor !== undefined) return
    void persist(draft, 'Nome da visão atualizado.').catch(reportFailure)
  }
  async function remove(): Promise<string | null> {
    if (!pendingDeletion || busy) return 'Aguarde a operação em andamento.'
    const controller = new AbortController(); mutation.current = controller; setBusy(true); setError('')
    try {
      await removeDashboard(pendingDeletion, identity, controller.signal)
      controller.signal.throwIfAborted()
      const remaining = saved.filter(item => item.id !== pendingDeletion.id)
      const overview = remaining.find(item => item.name.trim().toLocaleLowerCase('pt-BR') === 'visão geral')
      setSaved(remaining)
      const next = overview ? { name: overview.name, config: structuredClone(overview.config) } : template('visao-geral', draft.config.filters)
      setSelected(overview ?? null); setDraft(next); setBaseline(JSON.stringify(next)); setFilters(next.config.filters); setTemplateView(overview ? null : 'visao-geral'); setEditing(false); setOpened(false); setEditor(undefined); setFeedback('Visão excluída com sucesso.')
      return null
    } catch (failure: unknown) { return failure instanceof Error ? failure.message : 'Não foi possível excluir a visão.' }
    finally { if (mutation.current === controller) mutation.current = null; if (!controller.signal.aborted) setBusy(false) }
  }
  const defaultViewOptions = [{ value: 'visao-geral', label: 'Visão geral' }, { value: 'eventos', label: 'Eventos' }].map(option => {
    const item = saved.find(item => item.name.trim().toLocaleLowerCase('pt-BR') === option.label.toLocaleLowerCase('pt-BR'))
    return { ...option, savedId: item?.id }
  })
  const galleryItems: DashboardGalleryItem[] = [
    ...defaultViewOptions.map(option => {
      const item = saved.find(item => item.id === option.savedId)
      const value = template(option.value as AnalyticsView)
      return { id: option.value, name: item?.name ?? option.label, description: option.value === 'visao-geral' ? 'Conformidade e indicadores da equipe.' : 'Participação e resultados dos eventos.', widgetCount: (item?.config ?? value.config).widgets.length, view: option.value as AnalyticsView, saved: item ?? null }
    }),
    ...saved.filter(item => !defaultViewOptions.some(option => option.savedId === item.id)).map(item => ({ id: item.id, name: item.name, description: `Atualizado em ${new Date(item.updatedAt).toLocaleDateString('pt-BR')}`, widgetCount: item.config.widgets.length, view: null, saved: item })),
  ]
  function openCard(item: DashboardGalleryItem, edit: boolean, trigger: HTMLButtonElement) {
    galleryTrigger.current = trigger; galleryScroll.current = window.scrollY
    if (item.saved) openDraft({ name: item.saved.name, config: structuredClone(item.saved.config) }, null, item.saved, edit)
    else openDraft(template(item.view!), item.view, null, edit)
    requestAnimationFrame(() => { window.scrollTo({ top: 0, behavior: 'instant' }); headingRef.current?.focus({ preventScroll: true }) })
  }
  function backToGallery() {
    if (!canLeave()) return
    const previous = JSON.parse(baseline) as DashboardDraft
    setDraft(previous); setFilters(previous.config.filters); setEditing(false); setEditor(undefined); setError(''); setOpened(false)
    requestAnimationFrame(() => { window.scrollTo({ top: galleryScroll.current, behavior: 'instant' }); (galleryTrigger.current?.isConnected ? galleryTrigger.current : headingRef.current)?.focus({ preventScroll: true }) })
  }
  const metrics = templateView && !editing ? data.results[templateView]?.kpis : undefined
  const results = [...Object.values(data.results), ...Object.values(custom.results)]
  const updated = results.map(result => result?.generatedAt).filter(Boolean).sort()[0]
  const cacheHit = results.some(result => result?.cache?.hit)
  const metadataPending = draft.config.widgets.length > 0 && (data.pending || custom.pending)
  const cardDraft = cardEditorTarget ? cardEditorTarget.saved ? { name: cardEditorTarget.saved.name, config: cardEditorTarget.saved.config } : template(cardEditorTarget.view!) : draft
  return <AnalyticsPageLayout backTo={opened ? '/mainDashboardsScreen' : '/mainHomeScreen'} backLabel={opened ? 'Voltar para os dashboards' : 'Voltar para a Home'} onBack={event => { if (opened) { event.preventDefault(); backToGallery() } else if (!canLeave()) event.preventDefault() }}>
    <ActionLoading active={busy} />
    <header className="analytics-heading"><div><h1 id="dashboards-title" ref={headingRef} tabIndex={-1}>Dashboards</h1></div></header>
    <div hidden={opened}>
      <DashboardGallery items={galleryItems} loading={savedLoading} busy={busy} onOpen={openCard} onCustomize={(item, trigger) => { if (canLeave()) { initialSelection.current = false; cardEditorTrigger.current = trigger; setCardEditorTarget(item); setCardEditorOpen(true) } }} onCreate={trigger => { if (canLeave()) { newViewTrigger.current = trigger; initialSelection.current = false; setNewViewOpen(true) } }} onDelete={(item, trigger) => { if (item.saved) { deletionTrigger.current = trigger; setPendingDeletion(item.saved) } }} />
    </div>
    {newViewOpen && <DashboardViewModal existingNames={['Visão geral', 'Eventos', ...saved.map(item => item.name)]} onCreate={async (name, artwork) => {
      await persist({ name, config: { filters: draft.config.filters, widgets: [], artwork } }, 'Visão criada com sucesso.', null)
      setOpened(true); setEditing(true)
    }} onClose={() => { setNewViewOpen(false); requestAnimationFrame(() => (!opened && newViewTrigger.current?.isConnected ? newViewTrigger.current : headingRef.current)?.focus({ preventScroll: true })) }} />}
    {cardEditorOpen && <DashboardViewModal initialView={{ name: cardDraft.name, artwork: cardDraft.config.artwork ?? (cardDraft.name === 'Eventos' ? 'trends' : 'overview') }} existingNames={saved.filter(item => item.id !== (cardEditorTarget?.saved?.id ?? selected?.id)).map(item => item.name)} onCreate={async (name, artwork) => {
      await persist({ ...cardDraft, name, config: { ...cardDraft.config, artwork } }, 'Card atualizado com sucesso.', cardEditorTarget ? cardEditorTarget.saved : selected)
    }} onClose={() => { setCardEditorOpen(false); setCardEditorTarget(null); requestAnimationFrame(() => cardEditorTrigger.current?.isConnected && cardEditorTrigger.current.focus()) }} />}
    {pendingDeletion && <ConfirmationModal backdrop="dimmed" preservePageScroll className="forms-deletion-modal" confirmLabel="Excluir" tone="danger"
      title="Tem certeza de que deseja excluir esta visão?"
      icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>}
      onCancel={() => { setPendingDeletion(null); requestAnimationFrame(() => { if (deletionTrigger.current?.isConnected) deletionTrigger.current.focus() }) }}
      onConfirm={remove}
      onConfirmed={() => { setPendingDeletion(null); requestAnimationFrame(() => headingRef.current?.focus()) }} />}
    {savedError && <div className="analytics-feedback analytics-feedback--subtle" role="status"><p>Suas visões salvas não foram carregadas. {savedError}</p><button type="button" onClick={() => setSavedAttempt(n => n + 1)}>Tentar novamente</button></div>}
    {opened && <div className="analytics-content analytics-dashboard-detail">
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
      {editing ? <label htmlFor="analytics-view-name" className="analytics-view-name">Nome da visão<input id="analytics-view-name" maxLength={120} value={draft.name} disabled={busy} onBlur={event => { if (!(event.relatedTarget instanceof Element) || !event.relatedTarget.closest('button,a,[role="combobox"]')) saveName() }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); saveName() } }} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label> : <div><h2><TruncatedText nativeEllipsis>{draft.name}</TruncatedText></h2><AnalyticsLoadingContent variant="metadata" loading={metadataPending} label="Carregando a data de consulta…" contentKey={`${updated}/${cacheHit}`}>{updated && <p className="analytics-note">Consultado em {new Date(updated).toLocaleString('pt-BR')}{cacheHit ? ' · dados em cache' : ''}</p>}</AnalyticsLoadingContent></div>}
      {editing && <div className="analytics-actions">
        <PurpleButton type="button" className="analytics-secondary" disabled={busy || editor !== undefined} onClick={event => { cardEditorTrigger.current = event.currentTarget; setCardEditorOpen(true) }}><AstroIcon name="pencil" />Editar card</PurpleButton>
        <PurpleButton type="button" className="analytics-secondary" disabled={busy || draft.config.widgets.length >= 12 || editor !== undefined} onClick={event => openEditor(null, event.currentTarget)}><AstroIcon name="plus" />Adicionar gráfico</PurpleButton>
      </div>}
    </div>
    {error && <p role="alert" className="analytics-feedback">{error}</p>}
    {templateView && !editing && <div className="analytics-kpis">{Array.from({ length: data.pending ? 4 : metrics?.length ?? 0 }, (_, slot) => {
      const metric = metrics?.[slot]
      return <AnalyticsMetricCard key={metric?.key ?? `metric-placeholder-${slot}`} metric={metric} loading={data.pending} />
    })}</div>}
    {editing && <p className="analytics-note">Adicione até 12 gráficos. As alterações confirmadas nos popups são salvas automaticamente.</p>}
    {editor !== undefined && <AnalyticsEditorModal key={editor?.id || 'new'} widget={editor} charts={data.results} errors={data.errors} pending={data.pending} onDataset={setEditorView} onClose={closeEditor} onSave={updateWidget} filters={draft.config.filters} workspaceId={identity.workspaceId} catalog={catalog.catalog} catalogLoading={catalog.loading} catalogError={catalog.error} retryCatalog={catalog.retry} />}
    {!draft.config.widgets.length && editor === undefined && <section className="analytics-no-widgets"><AstroIcon name="report" /><h3>Sua visão começa com um gráfico</h3><p>Escolha um indicador, o tipo de visualização e organize seus dados aqui.</p>{editing && <PurpleButton type="button" className="analytics-primary" onClick={event => openEditor(null, event.currentTarget)}>Criar primeiro gráfico</PurpleButton>}</section>}
    <p className="analytics-sr-only" role="status">{announcement}</p>
    <div ref={gridRef} className="analytics-widget-grid" aria-busy={data.pending || custom.pending}>
      {renderedWidgets.map(widget => {
        const source = analyticsCatalog.find(item => item.id === widget.datasetId)
        const isCustom = widget.datasetId === 'custom'
        if (!source && !isCustom) return null
        const result = isCustom ? custom.results[widget.id] : data.results[source!.view]
        const chart = isCustom ? custom.results[widget.id]?.chart : data.results[source!.view]?.charts[source!.index]
        const failure = isCustom ? custom.errors[widget.id] : data.errors[source!.view]
        const pending = isCustom ? custom.pending && !chart && !failure : data.pending
        return <section key={widget.id} data-widget-id={widget.id} className={`create-forms-card create-forms-question-card analytics-widget analytics-widget--${widget.width}${dragging === widget.id ? ' analytics-widget--dragging' : ''}`} aria-label={widget.title}>
          {editing && <button type="button" className="create-forms-drag-bar-handle" disabled={busy || editor !== undefined} aria-label={`Reordenar ${widget.title}`} title="Segure a borda superior para arrastar. Use Alt + seta para cima ou para baixo." onPointerDown={event => onPointerDown(event, widget.id)} onKeyDown={event => {
            if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
            event.preventDefault(); moveByKeyboard(widget.id, event.key === 'ArrowUp' ? -1 : 1)
          }} />}
          <header><h3><TruncatedText nativeEllipsis>{widget.title}</TruncatedText></h3>{editing && <div className="create-forms-question-actions analytics-widget-actions">
            <button type="button" className="analytics-icon-button" disabled={busy || editor !== undefined} onClick={event => openEditor(widget, event.currentTarget)} aria-label={`Editar ${widget.title}`}><AstroIcon name="pencil" /></button>
            <button type="button" className="analytics-icon-button analytics-danger" disabled={busy || editor !== undefined} onClick={() => removeWidget(widget.id)} aria-label={`Remover ${widget.title}`}><AstroIcon name="trash" /></button>
          </div>}</header>
          <AnalyticsLoadingContent loading={pending} chartKind={widget.type} timestamp descriptionLines={chart ? Number(!chart.dateSensitive) + Number(!!chart.undefinedGroups) : 1} contentKey={JSON.stringify([widget.type, chart, failure, result?.generatedAt])}>{failure ? <div className="analytics-widget-error"><p role="alert">{failure}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Tentar novamente</button></div> : chart ? <AnalyticsChart chart={chart} kind={widget.type} /> : <p role="status" className="analytics-empty">Não foi possível encontrar os dados deste indicador.</p>}{result && <small className="analytics-widget-cache">Consultado às {new Date(result.generatedAt).toLocaleTimeString('pt-BR')}{result.cache?.hit ? ' · resultado em cache por até 90 s' : ''}</small>}</AnalyticsLoadingContent>
        </section>
      })}
    </div>
    </div>}
    <footer className="analytics-footer">Suas visões ficam salvas na sua conta e workspace e podem ser acessadas em outros dispositivos. Os resultados podem ser reutilizados por até 90 segundos; use Atualizar dados para consultar a fonte novamente.</footer>
  </AnalyticsPageLayout>
}


export default WorkspaceDashboards
