import { useActionFeedback } from '../../hooks/useActionFeedback'
import ApiContentSkeleton from '../../components/apiContentSkeleton'
import { SHOWCASE_NAMES } from '../../gtm/showcases'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppSidebar, AstroIcon, CompactPurpleButton, ConfirmationModal, OptionsPopup, ToolbarSearch } from '../../components'
import ListFilterControl from '../../components/listFilterControl'
import FormCard from '../../components/formCard'
import FormCardAppearanceModal from '../../components/formCardAppearanceModal'
import { formStatusLabels } from '../../data/forms'
import { useForms } from '../../hooks/useForms'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { useAnimatedResults } from '../../hooks/useAnimatedResults'
import { useExitPresence } from '../../hooks/useExitPresence'
import type { FormStatus, FormSummary } from '../../types/forms'

const statusOptions = [
  { value: '', label: 'Todos', tone: 'muted' as const },
  ...(['draft', 'pending', 'completed'] as const).map(value => ({ value, label: formStatusLabels[value] })),
]

function MainFormScreenPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [filters, setFilters] = useState<{ search: string; status: FormStatus | ''; page: number; minimum: string; maximum: string }>({ search: '', status: '', page: 1, minimum: '', maximum: '' })
  const [openId, setOpenId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [pendingDeletion, setPendingDeletion] = useState<FormSummary | null>(null)
  const [appearanceForm, setAppearanceForm] = useState<FormSummary | null>(null)
  const setFeedback = useActionFeedback(() => {
    const state: unknown = location.state
    return state && typeof state === 'object' && 'message' in state && typeof state.message === 'string' ? state.message : ''
  })
  const [pageSize, setPageSize] = useState(4)
  const { rows: forms, totalPages, totalElements, loading, error, retry, remove, saveAppearance } = useForms(filters.search, filters.status, filters.page, pageSize, { minimum: filters.minimum, maximum: filters.maximum })
  const contentRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const { closing, requestClose } = useAnimatedClose()

  useLayoutEffect(() => {
    const content = contentRef.current
    const main = content?.parentElement
    if (!content || !main) return
    let frame: number | null = null
    function fitCards() {
      if (!content || !main) return
      const grid = content.querySelector<HTMLElement>('.forms-grid')
      const card = grid?.querySelector<HTMLElement>('.form-card')
      if (!grid || grid.hidden || !card) return
      const mainStyle = getComputedStyle(main)
      const gap = parseFloat(getComputedStyle(grid).rowGap)
      const occupied = ['.position-heading', '.position-toolbar', '.forms-pagination', '.forms-feedback'].reduce((total, selector) => {
        const element = content.querySelector<HTMLElement>(selector)
        if (!element) return total
        const style = getComputedStyle(element)
        return total + element.getBoundingClientRect().height + parseFloat(style.marginTop) + parseFloat(style.marginBottom)
      }, 0)
      const available = main.clientHeight - parseFloat(mainStyle.paddingTop) - parseFloat(mainStyle.paddingBottom) - occupied
      const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length
      if (columns > 1) {
        setPageSize(4)
        return
      }
      const rows = Math.max(1, Math.floor((available + gap) / (card.getBoundingClientRect().height + gap)))
      if (Number.isFinite(rows)) setPageSize(Math.min(4, rows * columns))
    }
    // A medição altera o tamanho da lista e pode disparar outro layout.
    // Agrupa esses avisos fora do commit para não encadear atualizações síncronas.
    function scheduleFitCards() {
      if (frame !== null) return
      frame = window.requestAnimationFrame(() => {
        frame = null
        fitCards()
      })
    }
    scheduleFitCards()
    const observer = new ResizeObserver(scheduleFitCards)
    observer.observe(main)
    observer.observe(content)
    window.addEventListener('resize', scheduleFitCards)
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', scheduleFitCards)
    }
  }, [forms.length])
  const closeMenu = useCallback((afterClose?: () => void, restoreFocus = true) => {
    requestClose(() => {
      setOpenId(null)
      if (restoreFocus) triggerRef.current?.focus({ preventScroll: true })
      afterClose?.()
    })
  }, [requestClose])

  useEffect(() => {
    if (!openId) return
    function onOutside(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) closeMenu(undefined, false)
    }
    function onViewportChange() { closeMenu() }
    window.addEventListener('pointerdown', onOutside)
    window.addEventListener('scroll', onViewportChange, true)
    window.addEventListener('resize', onViewportChange)
    return () => {
      window.removeEventListener('pointerdown', onOutside)
      window.removeEventListener('scroll', onViewportChange, true)
      window.removeEventListener('resize', onViewportChange)
    }
  }, [openId, closeMenu])

  useLayoutEffect(() => {
    if (!openId || !triggerRef.current || !panelRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const panel = panelRef.current.getBoundingClientRect()
    const gap = 8
    const top = trigger.bottom + gap + panel.height <= window.innerHeight - gap ? trigger.bottom + gap : trigger.top - panel.height - gap
    setMenuPosition({ top: Math.max(gap, Math.min(top, window.innerHeight - panel.height - gap)), left: Math.max(gap, Math.min(trigger.right - panel.width, window.innerWidth - panel.width - gap)) })
  }, [openId])

  const pageCount = Math.max(1, totalPages)
  const page = filters.page
  if (!loading && !error && page > pageCount) setFilters(current => ({ ...current, page: pageCount }))
  const skeleton = useExitPresence(pageSize, loading)
  const results = useAnimatedResults(forms, `${loading ? 'loading' : 'ready'}:${JSON.stringify(forms.map(form => [form.id, form.name, form.icon, form.color]))}`, page, `${filters.search}|${filters.status}|${filters.minimum}|${filters.maximum}|${pageSize}`, true, loading)
  const selected = forms.find(form => form.id === openId)

  return (
    <div className="main-position-screen main-form-screen">
      <AppSidebar />
      <main data-track-page={true} className="position-main" id="conteudo-principal">
        <section aria-labelledby="forms-title" className="position-content astro-scale-90" ref={contentRef}>
          <header className="position-heading">
            <h1 id="forms-title" ref={headingRef} tabIndex={-1}>Formulários</h1>
            <p>Gerencie e organize todos os formulários.</p>
          </header>
          <div aria-label="Ações e filtros dos formulários" className="position-toolbar" role="group">
            <CompactPurpleButton data-track-action={BUTTONS.comuns.criar_forms} onClick={() => navigate('/createForms')} type="button"><AstroIcon name="plus" />Criar novo formulário</CompactPurpleButton>
            <ToolbarSearch label="Buscar formulários" placeholder="Buscar formulários..." value={filters.search} onChange={event => setFilters(current => ({ ...current, search: event.target.value.slice(0, 240), page: 1 }))} onClear={() => setFilters(current => ({ ...current, search: '', page: 1 }))} />
            <div className="position-toolbar-selects"><ListFilterControl label="Filtrar formulários" fields={[
              { id: 'status', label: 'Status', options: statusOptions },
              { id: 'minimum', label: 'Quantidade mínima de perguntas', kind: 'number' },
              { id: 'maximum', label: 'Quantidade máxima de perguntas', kind: 'number', minimumField: 'minimum' },
            ]} values={{ status: filters.status, minimum: filters.minimum, maximum: filters.maximum }} onApply={values => setFilters(current => ({ ...current, status: values.status as FormStatus | '', minimum: values.minimum, maximum: values.maximum, page: 1 }))} /></div>
          </div>
          {skeleton.present && <ApiContentSkeleton label="Carregando formulários" variant="cards" cardCount={skeleton.value} className={skeleton.exiting ? 'forms-skeleton--exiting' : ''} />}
          {!skeleton.present && error && <div role="alert"><p>{error}</p><button onClick={retry} type="button">Tentar novamente</button></div>}
          <div hidden={skeleton.present || !!error} data-track-showcase={SHOWCASE_NAMES.lista_formularios} aria-busy={loading || skeleton.present || results.exiting} className={`forms-grid${results.changed ? ' forms-grid--animated' : ''}${results.direction ? ` forms-grid--${results.direction}` : ''}${results.exiting ? ' forms-grid--exiting' : ''}`} key={results.signature}>
            {results.items.map(form => <FormCard key={form.id} form={form} menuOpen={openId === form.id} onOpen={() => navigate(`/editForms?id=${encodeURIComponent(form.id)}&mode=view`)} onOpenMenu={event => {
              const trigger = event.currentTarget
              const open = () => { triggerRef.current = trigger; setMenuPosition(null); setOpenId(form.id) }
              if (openId === form.id) closeMenu()
              else if (openId) closeMenu(open, false)
              else open()
            }} />)}
          </div>
          {!skeleton.present && !error && results.items.length === 0 && <p className="forms-empty" role="status">Nenhum formulário encontrado para esses filtros.</p>}
          <footer className="forms-pagination">
            <span aria-live="polite">Página {page} de {pageCount}{!loading && !error ? ` · ${totalElements} formulários` : ''}</span>
            <nav aria-label="Paginação dos formulários">
              {page > 1 && <button disabled={loading} data-track-action={BUTTONS.comuns.pagina_anterior} aria-label="Página anterior" onClick={() => setFilters(current => ({ ...current, page: page - 1 }))} type="button"><AstroIcon className="forms-pagination-previous" name="chevron-down" /></button>}
              <span aria-current="page" className="forms-current-page" key={page}>{page}</span>
              <button data-track-action={BUTTONS.comuns.proxima_pagina} aria-label="Próxima página" disabled={loading || !!error || page >= pageCount} onClick={() => setFilters(current => ({ ...current, page: page + 1 }))} type="button"><AstroIcon className="forms-pagination-next" name="chevron-down" /></button>
            </nav>
          </footer>
        </section>
      </main>
      {selected && createPortal(<OptionsPopup trackingName={DIALOG_NAMES.acoes_formulario} ariaLabel={`Opções para ${selected.name}`} closing={closing} id={`form-options-${selected.id}`} panelRef={panelRef} onClose={() => closeMenu()} style={{ top: menuPosition?.top ?? 0, left: menuPosition?.left ?? 0, visibility: menuPosition ? 'visible' : 'hidden' }} items={[
        { trackingAction: BUTTONS.comuns.cancelar, id: 'cancel', label: 'Cancelar', tone: 'muted', separatorAfter: true, onSelect: () => closeMenu() },
        ...(selected.status === 'completed' ? [{ id: 'responses', label: 'Ver respostas',
          onSelect: () => closeMenu(() => navigate(`/mainFormScreen/responses?id=${encodeURIComponent(selected.id)}`)) }] : [
          { trackingAction: BUTTONS.comuns.editar, id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => closeMenu(() => navigate(`/editForms?id=${encodeURIComponent(selected.id)}`)) },
          { id: 'appearance', label: 'Personalizar card', separatorAfter: true, onSelect: () => closeMenu(() => setAppearanceForm(selected), false) },
          { trackingAction: BUTTONS.comuns.excluir, id: 'delete', label: 'Excluir', tone: 'danger' as const, onSelect: () => closeMenu(() => setPendingDeletion(selected)) },
        ]),
      ]} />, document.body)}
      {appearanceForm && <FormCardAppearanceModal name={appearanceForm.name} initial={appearanceForm} onSave={async appearance => { await saveAppearance(appearanceForm.id, appearance); setFeedback('Aparência do card atualizada.') }} onClose={() => { setAppearanceForm(null); requestAnimationFrame(() => triggerRef.current?.isConnected && triggerRef.current.focus()) }} />}
      {pendingDeletion && <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_exclusao_formulario} backdrop="dimmed" preservePageScroll className="forms-deletion-modal" confirmLabel="Excluir" progressLabel="Excluindo formulário..." tone="danger" title="Tem certeza de que deseja excluir este formulário?" icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>} onCancel={() => setPendingDeletion(null)} onConfirm={async () => {
        await remove(pendingDeletion.id)
        return null
      }} onConfirmed={() => {
        setFeedback(`Formulário ${pendingDeletion.name} excluído.`)
        setPendingDeletion(null)
        requestAnimationFrame(() => headingRef.current?.focus())
      }} />}
    </div>
  )
}

export default MainFormScreenPage
