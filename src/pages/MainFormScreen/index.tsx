import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, ConfirmationModal, OptionsPopup, ToolbarSearch, ToolbarSelect } from '../../components'
import FormCard from '../../components/FormCard'
import { formStatusLabels, mockForms } from '../../data/forms'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { useAnimatedResults } from '../../hooks/useAnimatedResults'
import type { FormSummary } from '../../types/forms'

const statusOptions = [
  { value: '', label: 'Status', tone: 'muted' as const },
  ...(['draft', 'pending', 'completed'] as const).map(value => ({ value, label: formStatusLabels[value] })),
]

function MainFormScreenPage() {
  const navigate = useNavigate()
  const [forms, setForms] = useState(mockForms)
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 })
  const [openId, setOpenId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [pendingDeletion, setPendingDeletion] = useState<FormSummary | null>(null)
  const [feedback, setFeedback] = useState('')
  const [pageSize, setPageSize] = useState(4)
  const contentRef = useRef<HTMLElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const { closing, requestClose } = useAnimatedClose(160)

  useLayoutEffect(() => {
    const content = contentRef.current
    const main = content?.parentElement
    if (!content || !main) return
    function fitCards() {
      if (!content || !main) return
      const grid = content.querySelector<HTMLElement>('.forms-grid')
      const card = grid?.querySelector<HTMLElement>('.form-card')
      if (!grid || !card) return
      const mainStyle = getComputedStyle(main)
      const gap = parseFloat(getComputedStyle(grid).rowGap)
      const occupied = ['.position-heading', '.position-toolbar', '.forms-pagination'].reduce((total, selector) => {
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
      setPageSize(Math.min(4, rows * columns))
    }
    fitCards()
    const observer = new ResizeObserver(fitCards)
    observer.observe(main)
    observer.observe(content)
    window.addEventListener('resize', fitCards)
    return () => { observer.disconnect(); window.removeEventListener('resize', fitCards) }
  }, [])
  const closeMenu = useCallback((afterClose?: () => void, restoreFocus = true) => {
    requestClose(() => {
      setOpenId(null)
      if (restoreFocus) triggerRef.current?.focus()
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

  const search = filters.search.trim().toLocaleLowerCase('pt-BR')
  const filtered = forms.filter(form => `${form.name} ${form.description}`.toLocaleLowerCase('pt-BR').includes(search) && (!filters.status || form.status === filters.status))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(filters.page, pageCount)
  const visible = useMemo(() => {
    const query = filters.search.trim().toLocaleLowerCase('pt-BR')
    return forms.filter(form => `${form.name} ${form.description}`.toLocaleLowerCase('pt-BR').includes(query) && (!filters.status || form.status === filters.status)).slice((page - 1) * pageSize, page * pageSize)
  }, [forms, filters.search, filters.status, page, pageSize])
  const results = useAnimatedResults(visible, visible.map(form => form.id).join(','), page, `${filters.search}|${filters.status}|${pageSize}`)
  const selected = forms.find(form => form.id === openId)

  return (
    <div className="main-position-screen main-form-screen">
      <AppSidebar />
      <main className="position-main" id="conteudo-principal">
        <section aria-labelledby="forms-title" className="position-content astro-scale-90" ref={contentRef}>
          <header className="position-heading">
            <h1 id="forms-title" ref={headingRef} tabIndex={-1}>Formulários</h1>
            <p>Gerencie e organize todos os formulários.</p>
          </header>
          <div aria-label="Ações e filtros dos formulários" className="position-toolbar" role="group">
            <CompactPurpleButton onClick={() => navigate('/createForms')} type="button"><AstroIcon name="plus" />Criar novo formulário</CompactPurpleButton>
            <ToolbarSearch label="Buscar formulários" placeholder="Buscar formulários..." value={filters.search} onChange={event => setFilters(current => ({ ...current, search: event.target.value, page: 1 }))} onClear={() => setFilters(current => ({ ...current, search: '', page: 1 }))} />
            <div className="position-toolbar-selects"><ToolbarSelect label="Filtrar por status" options={statusOptions} value={filters.status} onValueChange={status => setFilters(current => ({ ...current, status, page: 1 }))} /></div>
          </div>
          <div aria-busy={results.exiting} className={`forms-grid${results.changed ? ' forms-grid--animated' : ''}${results.direction ? ` forms-grid--${results.direction}` : ''}${results.exiting ? ' forms-grid--exiting' : ''}`} key={results.signature}>
            {results.items.map(form => <FormCard key={form.id} form={form} menuOpen={openId === form.id} onOpenMenu={event => {
              const trigger = event.currentTarget
              const open = () => { triggerRef.current = trigger; setMenuPosition(null); setOpenId(form.id) }
              if (openId === form.id) closeMenu()
              else if (openId) closeMenu(open, false)
              else open()
            }} />)}
          </div>
          {results.items.length === 0 && <p className="forms-empty" role="status">Nenhum formulário encontrado para esses filtros.</p>}
          <footer className="forms-pagination">
            <span aria-live="polite">Página {page} de {pageCount}</span>
            <nav aria-label="Paginação dos formulários">
              {page > 1 && <button aria-label="Página anterior" onClick={() => setFilters(current => ({ ...current, page: page - 1 }))} type="button"><AstroIcon className="forms-pagination-previous" name="chevron-down" /></button>}
              <span aria-current="page" className="forms-current-page" key={page}>{page}</span>
              <button aria-label="Próxima página" disabled={page === pageCount} onClick={() => setFilters(current => ({ ...current, page: page + 1 }))} type="button"><AstroIcon className="forms-pagination-next" name="chevron-down" /></button>
            </nav>
          </footer>
          <p className="sr-only" role="status">{feedback}</p>
        </section>
        <AstroChat />
      </main>
      {selected && createPortal(<OptionsPopup ariaLabel={`Opções para ${selected.name}`} closing={closing} id={`form-options-${selected.id}`} panelRef={panelRef} onClose={() => closeMenu()} style={{ top: menuPosition?.top ?? 0, left: menuPosition?.left ?? 0, visibility: menuPosition ? 'visible' : 'hidden' }} items={[
        { id: 'cancel', label: 'Cancelar', tone: 'muted', separatorAfter: true, onSelect: () => closeMenu() },
        { id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => closeMenu(() => navigate('/editForms', { state: { form: selected } })) },
        { id: 'delete', label: 'Excluir', tone: 'danger', onSelect: () => closeMenu(() => setPendingDeletion(selected)) },
      ]} />, document.body)}
      {pendingDeletion && <ConfirmationModal backdrop="dimmed" preservePageScroll className="forms-deletion-modal" confirmLabel="Excluir" tone="danger" title="Tem certeza de que deseja excluir este formulário?" icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>} onCancel={() => setPendingDeletion(null)} onConfirm={() => {
        return null
      }} onConfirmed={() => {
        setForms(current => current.filter(form => form.id !== pendingDeletion.id))
        setFeedback(`Formulário ${pendingDeletion.name} excluído.`)
        setPendingDeletion(null)
        requestAnimationFrame(() => headingRef.current?.focus())
      }} />}
    </div>
  )
}

export default MainFormScreenPage
