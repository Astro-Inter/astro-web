import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, ConfirmationModal, ToggleSwitch, ToolbarSearch, ToolbarSelect } from '../../components'
import EventCalendar from '../../components/eventCalendar'
import EventOptionsModal from '../../components/eventOptionsModal'
import CreateEventFlowModal from '../../components/createEventFlowModal'
import { eventCategoryLabels, mockEvents } from '../../data/events'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { useAnimatedResults } from '../../hooks/useAnimatedResults'
import type { CalendarEvent, CalendarView, EventCategory } from '../../types/events'
import type { EventConfiguration } from '../../types/eventCreation'
import { calendarEntriesForEvent, configurationForEvent } from '../../utils/eventEditing'
import { shiftCalendarPeriod, weekDays } from '../../utils/events'

const categoryOptions: { category: EventCategory; label: string }[] = [
  { category: 'today', label: 'Dia atual' },
  { category: 'commitment', label: 'Compromisso' },
  { category: 'reminder', label: 'Lembretes' },
]

const viewOptions = [
  { value: 'week', label: 'Essa semana' },
  { value: 'month', label: 'Esse mês' },
  { value: 'year', label: 'Esse ano' },
]

function MainEventScreenPage() {
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  })
  const [view, setView] = useState<CalendarView>('month')
  const [events, setEvents] = useState<CalendarEvent[]>(mockEvents)
  const [filters, setFilters] = useState({
    search: '',
    categories: { today: true, commitment: true, reminder: true } as Record<EventCategory, boolean>,
  })
  const [filterOpen, setFilterOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [pendingDeletion, setPendingDeletion] = useState<CalendarEvent | null>(null)
  const [feedback, setFeedback] = useState('')
  const [editor, setEditor] = useState<{ mode: 'create' } | { mode: 'edit'; event: CalendarEvent; value: EventConfiguration } | null>(null)
  const [savedEventId, setSavedEventId] = useState<string | null>(null)
  const [animateCalendar, setAnimateCalendar] = useState(true)
  const pendingSavedIdRef = useRef<string | null>(null)
  const saveAnimationTimerRef = useRef<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const filterControlRef = useRef<HTMLDivElement | null>(null)
  const filterTriggerRef = useRef<HTMLButtonElement | null>(null)
  const { closing, requestClose } = useAnimatedClose()
  const { closing: filterClosing, requestClose: requestCloseFilters } = useAnimatedClose()

  useEffect(() => () => {
    if (saveAnimationTimerRef.current !== null) window.clearTimeout(saveAnimationTimerRef.current)
  }, [])

  const closeFilters = useCallback((restoreFocus = false) => {
    requestCloseFilters(() => {
      setFilterOpen(false)
      if (restoreFocus) filterTriggerRef.current?.focus()
    })
  }, [requestCloseFilters])

  useEffect(() => {
    if (!filterOpen) return
    function closeOutside(event: PointerEvent) {
      if (!filterControlRef.current?.contains(event.target as Node)) closeFilters()
    }
    function closeOnScroll(event: Event) {
      if (event.target instanceof Node && filterControlRef.current?.contains(event.target)) return
      closeFilters()
    }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [closeFilters, filterOpen])

  function handleFilterKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || !filterOpen) return
    event.preventDefault()
    closeFilters(true)
  }

  const closeMenu = useCallback((afterClose?: () => void, restoreFocus = true) => {
    requestClose(() => {
      setOpenId(null)
      if (restoreFocus) triggerRef.current?.focus()
      afterClose?.()
    })
  }, [requestClose])

  useEffect(() => {
    if (!openId) return
    function closeOutside(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) closeMenu(undefined, false)
    }
    function closeOnViewportChange() { closeMenu() }
    window.addEventListener('pointerdown', closeOutside)
    window.addEventListener('scroll', closeOnViewportChange, true)
    window.addEventListener('resize', closeOnViewportChange)
    return () => {
      window.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('scroll', closeOnViewportChange, true)
      window.removeEventListener('resize', closeOnViewportChange)
    }
  }, [closeMenu, openId])

  useLayoutEffect(() => {
    if (!openId || !triggerRef.current || !panelRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const panel = panelRef.current.getBoundingClientRect()
    const gap = 8
    const below = trigger.bottom + gap
    const top = below + panel.height <= window.innerHeight - gap ? below : trigger.top - panel.height - gap
    setMenuPosition({
      top: Math.max(gap, Math.min(top, window.innerHeight - panel.height - gap)),
      left: Math.max(gap, Math.min(trigger.right - panel.width, window.innerWidth - panel.width - gap)),
    })
  }, [openId])

  const search = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleEvents = useMemo(() => events.filter(event =>
    filters.categories[event.category]
    && `${event.title} ${eventCategoryLabels[event.category]}`.toLocaleLowerCase('pt-BR').includes(search),
  ), [events, filters.categories, search])
  const calendarSnapshot = useMemo(() => [{ month, view, events: visibleEvents }], [month, view, visibleEvents])
  const calendarSignature = `${view}|${month.getTime()}|${JSON.stringify(visibleEvents.map(event => [event.id, event.title, event.date, event.category, event.category === 'today' ? '' : event.startTime, event.category === 'today' ? '' : event.endTime]))}`
  const calendarResults = useAnimatedResults(calendarSnapshot, calendarSignature, month.getTime(), view, animateCalendar)
  const displayedCalendar = calendarResults.items[0]
  const selected = events.find(event => event.id === openId)
  const visiblePeriodCount = visibleEvents.filter(event => {
    if (view === 'year') return event.date.startsWith(`${month.getFullYear()}-`)
    if (view === 'month') return event.date.startsWith(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-`)
    return weekDays(month).some(day => day.date === event.date)
  }).length

  function openOptions(event: CalendarEvent, trigger: HTMLButtonElement) {
    if (event.category === 'today') return
    const open = () => {
      triggerRef.current = trigger
      setMenuPosition(null)
      setOpenId(event.id)
    }
    if (openId === event.id) closeMenu()
    else if (openId) closeMenu(open, false)
    else open()
  }

  function saveEvent(value: EventConfiguration) {
    if (!editor) return
    const existing = editor.mode === 'edit' ? editor.event : null
    const eventId = existing?.eventId ?? existing?.id ?? crypto.randomUUID()
    const category = existing && existing.category !== 'today' ? existing.category : value.draft.type.trim().toLocaleLowerCase('pt-BR') === 'lembrete' ? 'reminder' : 'commitment'
    const entries = calendarEntriesForEvent(value, eventId, category)
    setAnimateCalendar(false)
    setEvents(current => [...current.filter(event => (event.eventId ?? event.id) !== eventId), ...entries])
    pendingSavedIdRef.current = eventId
    const firstDate = entries[0]?.date
    if (firstDate) setMonth(new Date(`${firstDate}T12:00:00`))
    setFeedback(`Evento ${value.draft.title.trim()} ${existing ? 'atualizado' : 'criado'} com sucesso.`)
  }

  function changeCalendar(update: () => void) {
    setAnimateCalendar(true)
    update()
  }

  function closeEditor() {
    setEditor(null)
    if (pendingSavedIdRef.current) {
      if (saveAnimationTimerRef.current !== null) window.clearTimeout(saveAnimationTimerRef.current)
      setSavedEventId(pendingSavedIdRef.current)
      pendingSavedIdRef.current = null
      saveAnimationTimerRef.current = window.setTimeout(() => {
        saveAnimationTimerRef.current = null
        setSavedEventId(null)
      }, 900)
    }
    requestAnimationFrame(() => {
      if (!triggerRef.current?.isConnected) headingRef.current?.focus({ preventScroll: true })
    })
  }

  return (
    <div className="main-position-screen main-event-screen">
      <AppSidebar />
      <main className="position-main" id="conteudo-principal">
        <section aria-labelledby="events-title" className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="events-title" ref={headingRef} tabIndex={-1}>Eventos</h1>
            <p>Organize eventos, acompanhe as atividades e gerencie a criação e programação de cada evento.</p>
          </header>
          <div aria-label="Ações e filtros dos eventos" className="position-toolbar" role="group">
            <CompactPurpleButton className="event-create-button" onClick={() => { setOpenId(null); setFilterOpen(false); setEditor({ mode: 'create' }) }} type="button"><AstroIcon name="plus" />Criar evento</CompactPurpleButton>
            <ToolbarSearch label="Buscar eventos" placeholder="Buscar eventos..." value={filters.search} onChange={event => changeCalendar(() => setFilters(current => ({ ...current, search: event.target.value })))} onClear={() => changeCalendar(() => setFilters(current => ({ ...current, search: '' })))} />
            <div className="position-toolbar-selects">
              <div className="event-filter-control" onBlur={event => { if (filterOpen && !event.currentTarget.contains(event.relatedTarget)) closeFilters() }} onKeyDown={handleFilterKeyDown} ref={filterControlRef}>
                <button aria-controls="event-filter-popover" aria-expanded={filterOpen && !filterClosing} aria-label="Filtros do calendário" className="event-filter-trigger" onClick={() => { if (filterOpen) closeFilters(); else { if (openId) closeMenu(undefined, false); setFilterOpen(true) } }} ref={filterTriggerRef} type="button">
                  Filtros <AstroIcon name="chevron-down" />
                </button>
                {filterOpen && <aside aria-label="Filtros do calendário" className={`event-filter-panel${filterClosing ? ' event-filter-panel--closing' : ''}`} id="event-filter-popover">
                  <h2>Filtros</h2>
                  <div className="event-filter-list">
                    {categoryOptions.map(({ category, label }) => (
                      <div className="event-filter-row" key={category}>
                        <span aria-hidden="true" className={`event-filter-dot event-filter-dot--${category}`} />
                        <span className="event-filter-label">{label}</span>
                        <ToggleSwitch checked={filters.categories[category]} label={`Mostrar ${label.toLocaleLowerCase('pt-BR')}`} onChange={checked => changeCalendar(() => setFilters(current => ({ ...current, categories: { ...current.categories, [category]: checked } })))} />
                      </div>
                    ))}
                  </div>
                </aside>}
              </div>
              <ToolbarSelect label="Visualização do calendário" options={viewOptions} searchable={false} value={view} onValueChange={value => changeCalendar(() => { setOpenId(null); setView(value as CalendarView) })} />
            </div>
          </div>
          <div className="event-board">
            <div aria-busy={calendarResults.exiting} className={`event-calendar-transition${calendarResults.changed ? ' event-calendar-transition--animated' : ''}${calendarResults.direction ? ` event-calendar-transition--${calendarResults.direction}` : ''}${calendarResults.exiting ? ' event-calendar-transition--exiting' : ''}`} key={calendarResults.signature}>
              <EventCalendar events={displayedCalendar.events} month={displayedCalendar.month} view={displayedCalendar.view} onMonthChange={amount => changeCalendar(() => { setOpenId(null); setMonth(current => shiftCalendarPeriod(current, view, amount)) })} onOpenOptions={openOptions} selectedEventId={openId} savedEventId={savedEventId} />
            </div>
          </div>
          <p className="sr-only" role="status">{visiblePeriodCount} eventos visíveis neste período. {feedback}</p>
        </section>
        <AstroChat />
      </main>
      {selected && createPortal(<EventOptionsModal closing={closing} event={selected} onClose={() => closeMenu()} onEdit={() => closeMenu(() => setEditor({ mode: 'edit', event: selected, value: configurationForEvent(selected) }))} onDelete={() => closeMenu(() => setPendingDeletion(selected))} panelRef={panelRef} style={{ top: menuPosition?.top ?? 0, left: menuPosition?.left ?? 0, visibility: menuPosition ? 'visible' : 'hidden' }} />, document.body)}
      {pendingDeletion && <ConfirmationModal backdrop="dimmed" preservePageScroll className="event-deletion-modal" confirmLabel="Excluir" tone="danger" title="Tem certeza de que deseja excluir este evento?" icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>} onCancel={() => setPendingDeletion(null)} onConfirm={() => null} onConfirmed={() => {
        setAnimateCalendar(true)
        setEvents(current => current.filter(event => (event.eventId ?? event.id) !== (pendingDeletion.eventId ?? pendingDeletion.id)))
        setFeedback(`Evento ${pendingDeletion.title} excluído.`)
        setPendingDeletion(null)
        requestAnimationFrame(() => headingRef.current?.focus())
      }} />}
      {editor && <CreateEventFlowModal initialValue={editor.mode === 'edit' ? editor.value : undefined} mode={editor.mode} onClose={closeEditor} onSubmit={saveEvent} />}
    </div>
  )
}

export default MainEventScreenPage
