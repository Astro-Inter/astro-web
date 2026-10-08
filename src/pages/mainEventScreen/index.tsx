import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, ConfirmationModal, ToolbarSearch, ToolbarSelect } from '../../components'
import EventCalendar from '../../components/eventCalendar'
import EventOptionsModal from '../../components/eventOptionsModal'
import CreateEventFlowModal from '../../components/createEventFlowModal'
import { mockEventManager, mockEvents } from '../../data/events'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { useAnimatedResults } from '../../hooks/useAnimatedResults'
import type { CalendarEvent, CalendarView } from '../../types/events'
import type { EventConfiguration } from '../../types/eventCreation'
import { calendarEntriesForEvent, configurationForEvent, canEditEvent, validateEventEdit, validateEventConfiguration, numberEventsByDay } from '../../utils/eventEditing'
import { shiftCalendarPeriod, weekDays } from '../../utils/events'

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
  const [searchText, setSearchText] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [pendingInactivation, setPendingInactivation] = useState<CalendarEvent | null>(null)
  const [feedback, setFeedback] = useState('')
  const [editor, setEditor] = useState<{ mode: 'create' } | { mode: 'edit'; event: CalendarEvent; value: EventConfiguration } | null>(null)
  const [savedEventId, setSavedEventId] = useState<string | null>(null)
  const [animateCalendar, setAnimateCalendar] = useState(true)
  const pendingSavedIdRef = useRef<string | null>(null)
  const saveAnimationTimerRef = useRef<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const { closing, requestClose } = useAnimatedClose()

  useEffect(() => () => {
    if (saveAnimationTimerRef.current !== null) window.clearTimeout(saveAnimationTimerRef.current)
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

  const search = searchText.trim().toLocaleLowerCase('pt-BR')
  const numberedEvents = useMemo(() => numberEventsByDay(events), [events])
  const visibleEvents = useMemo(() => numberedEvents.filter(event =>
    `${event.title} Evento ${event.eventNumber ?? ''}`.toLocaleLowerCase('pt-BR').includes(search),
  ), [numberedEvents, search])
  const calendarSnapshot = useMemo(() => [{ month, view, events: visibleEvents }], [month, view, visibleEvents])
  const calendarSignature = `${view}|${month.getTime()}|${JSON.stringify(visibleEvents.map(event => [event.id, event.title, event.date, event.category, event.inactive, event.eventNumber, event.category === 'today' ? '' : event.startTime, event.category === 'today' ? '' : event.endTime]))}`
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
    const original = existing ? configurationForEvent(existing) : null
    const error = validateEventConfiguration(value) ?? (original ? validateEventEdit(original, value, mockEventManager.id) : null)
    if (error) { setFeedback(error); return }
    const entries = calendarEntriesForEvent(value, eventId, 'event', undefined, existing?.inactive)
    setAnimateCalendar(false)
    setEvents(current => {
      const index = current.findIndex(event => (event.eventId ?? event.id) === eventId)
      const remaining = current.filter(event => (event.eventId ?? event.id) !== eventId)
      return index < 0 ? [...remaining, ...entries] : [...remaining.slice(0, index), ...entries, ...remaining.slice(index)]
    })
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
            <CompactPurpleButton className="event-create-button" onClick={() => { setOpenId(null); setEditor({ mode: 'create' }) }} type="button"><AstroIcon name="plus" />Criar evento</CompactPurpleButton>
            <ToolbarSearch label="Buscar eventos" placeholder="Buscar eventos..." value={searchText} onChange={event => changeCalendar(() => setSearchText(event.target.value))} onClear={() => changeCalendar(() => setSearchText(''))} />
            <div className="position-toolbar-selects">
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
      {selected && createPortal(<EventOptionsModal closing={closing} event={selected} canEdit={!selected.inactive && canEditEvent(configurationForEvent(selected), mockEventManager.id)} onClose={() => closeMenu()} onEdit={() => closeMenu(() => setEditor({ mode: 'edit', event: selected, value: configurationForEvent(selected) }))} onInactivate={() => closeMenu(() => setPendingInactivation(selected))} panelRef={panelRef} style={{ top: menuPosition?.top ?? 0, left: menuPosition?.left ?? 0, visibility: menuPosition ? 'visible' : 'hidden' }} />, document.body)}
      {pendingInactivation && <ConfirmationModal backdrop="dimmed" preservePageScroll className="event-deactivation-modal" confirmLabel="Inativar" tone="danger" title="Tem certeza de que deseja inativar este evento?" icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>} onCancel={() => setPendingInactivation(null)} onConfirm={() => null} onConfirmed={() => {
        setAnimateCalendar(true)
        setEvents(current => current.map(event => (event.eventId ?? event.id) === (pendingInactivation.eventId ?? pendingInactivation.id) ? { ...event, inactive: true } : event))
        setFeedback(`Evento ${pendingInactivation.title} inativado.`)
        setPendingInactivation(null)
        requestAnimationFrame(() => headingRef.current?.focus())
      }} />}
      {editor && <CreateEventFlowModal managerId={mockEventManager.id} initialValue={editor.mode === 'edit' ? editor.value : undefined} mode={editor.mode} onClose={closeEditor} onSubmit={saveEvent} />}
    </div>
  )
}

export default MainEventScreenPage
