import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { AppSidebar, AstroIcon, CompactPurpleButton, ConfirmationModal, ToolbarSearch, ToolbarSelect } from '../../components'
import EventCalendar from '../../components/eventCalendar'
import EventOptionsModal from '../../components/eventOptionsModal'
import EventDetailsModal from '../../components/eventDetailsModal'
import CreateEventFlowModal from '../../components/createEventFlowModal'
import { detailedCalendarEvent, useEvents } from '../../hooks/useEvents'
import { useAuthentication } from '../../hooks/useAuthentication'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { useAnimatedResults } from '../../hooks/useAnimatedResults'
import type { CalendarEvent, CalendarView } from '../../types/events'
import type { EventConfiguration } from '../../types/eventCreation'
import { configurationForEvent, numberEventsByDay } from '../../utils/eventEditing'
import { shiftCalendarPeriod, weekDays } from '../../utils/events'

const viewOptions = [
  { value: 'week', label: 'Essa semana' },
  { value: 'month', label: 'Esse mês' },
  { value: 'year', label: 'Esse ano' },
]

function EventScreenContent() {
  const location = useLocation()
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  })
  const [view, setView] = useState<CalendarView>('month')
  const [searchText, setSearchText] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [pendingInactivation, setPendingInactivation] = useState<CalendarEvent | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [informationEvent, setInformationEvent] = useState<CalendarEvent | null>(null)
  const [feedback, setFeedback] = useState('')
  const [editor, setEditor] = useState<{ mode: 'create' } | { mode: 'edit'; event: CalendarEvent; value: EventConfiguration } | null>(() => location.state?.openCreate === true ? { mode: 'create' } : null)
  const [savedEventId, setSavedEventId] = useState<string | null>(null)
  const [animateCalendar, setAnimateCalendar] = useState(true)
  const pendingSavedIdRef = useRef<string | null>(null)
  const saveAnimationTimerRef = useRef<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const { closing, requestClose } = useAnimatedClose()
  const { events, loading, error, retry, details, retryDetails, save, cancel } = useEvents(month, view, openId ? openId.split(':')[0] : undefined)

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
  }, [openId, details.loading, details.error])

  const search = searchText.trim().toLocaleLowerCase('pt-BR')
  const numberedEvents = useMemo(() => numberEventsByDay(events), [events])
  const visibleEvents = useMemo(() => numberedEvents.filter(event =>
    event.title.toLocaleLowerCase('pt-BR').includes(search),
  ), [numberedEvents, search])
  const calendarSnapshot = useMemo(() => [{ month, view, events: visibleEvents }], [month, view, visibleEvents])
  const calendarSignature = `${view}|${month.getTime()}|${JSON.stringify(visibleEvents.map(event => [event.id, event.title, event.date, event.category, event.inactive, event.eventNumber, event.category === 'today' ? '' : event.startTime, event.category === 'today' ? '' : event.endTime]))}`
  const calendarResults = useAnimatedResults(calendarSnapshot, calendarSignature, month.getTime(), view, animateCalendar)
  const displayedCalendar = calendarResults.items[0]
  const selectedEntry = events.find(event => event.id === openId)
  const selected = selectedEntry && details.data ? detailedCalendarEvent(selectedEntry, details.data) : selectedEntry
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

  async function saveEvent(value: EventConfiguration): Promise<void> {
    if (!editor) return
    const existing = editor.mode === 'edit' ? editor.event : null
    const saved = await save(value, existing?.eventId ?? existing?.id)
    const eventId = String(saved.id)
    setAnimateCalendar(false)
    pendingSavedIdRef.current = eventId
    const firstDate = saved.eventClasses[0]?.startDate.slice(0, 10)
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
      <main data-track-page={true} className="position-main" id="conteudo-principal">
        <section aria-labelledby="events-title" className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="events-title" ref={headingRef} tabIndex={-1}>Eventos</h1>
            <p>Organize eventos, acompanhe as atividades e gerencie a criação e programação de cada evento.</p>
          </header>
          <div aria-label="Ações e filtros dos eventos" className="position-toolbar" role="group">
            <CompactPurpleButton data-track-action={BUTTONS.comuns.criar_evento} className="event-create-button" onClick={() => { setOpenId(null); setFeedback(''); setEditor({ mode: 'create' }) }} type="button"><AstroIcon name="plus" />Criar evento</CompactPurpleButton>
            <ToolbarSearch label="Buscar eventos" placeholder="Buscar eventos..." value={searchText} onChange={event => changeCalendar(() => setSearchText(event.target.value))} onClear={() => changeCalendar(() => setSearchText(''))} />
            <div className="position-toolbar-selects">
              <ToolbarSelect trackingAction={BUTTONS.comuns.calendario} label="Visualização do calendário" options={viewOptions} searchable={false} value={view} onValueChange={value => changeCalendar(() => { setOpenId(null); setView(value as CalendarView) })} />
            </div>
          </div>
          {loading && <p role="status">Carregando eventos...</p>}
          {error && <div role="alert"><p>{error}</p><button className="astro-modal-cancel" onClick={retry} type="button">Tentar novamente</button></div>}
          {!loading && !error && visiblePeriodCount === 0 && <p role="status">Nenhum evento encontrado neste período.</p>}
          {feedback && <p role="status">{feedback}</p>}
          {openId && details.loading && <p className="sr-only" role="status">Carregando informações do evento...</p>}
          {openId && details.error && <div role="alert"><p>{details.error}</p><button className="astro-modal-cancel" onClick={retryDetails} type="button">Tentar novamente</button></div>}
          <div className="event-board">
            <div aria-busy={loading || calendarResults.exiting} className={`event-calendar-transition${calendarResults.changed ? ' event-calendar-transition--animated' : ''}${calendarResults.direction ? ` event-calendar-transition--${calendarResults.direction}` : ''}${calendarResults.exiting ? ' event-calendar-transition--exiting' : ''}`} key={calendarResults.signature}>
              <EventCalendar events={displayedCalendar.events} month={displayedCalendar.month} view={displayedCalendar.view} onMonthChange={amount => changeCalendar(() => { setOpenId(null); setMonth(current => shiftCalendarPeriod(current, view, amount)) })} onOpenOptions={openOptions} selectedEventId={openId} savedEventId={savedEventId} />
            </div>
          </div>
          <p className="sr-only" role="status">{visiblePeriodCount} eventos visíveis neste período. {feedback}</p>
        </section>
      </main>
      {selected && createPortal(<EventOptionsModal loading={details.loading} error={details.error} onRetry={retryDetails} closing={closing} event={selected} canEdit={details.data?.canEdit ?? false} canCancel={details.data?.canCancel ?? false} informationReady={!!details.data} onClose={() => closeMenu()} onViewInformation={() => closeMenu(() => setInformationEvent(selected))} onEdit={() => closeMenu(() => setEditor({ mode: 'edit', event: selected, value: configurationForEvent(selected) }))} onInactivate={() => closeMenu(() => { setCancellationReason(''); setPendingInactivation(selected) })} panelRef={panelRef} style={{ top: menuPosition?.top ?? 0, left: menuPosition?.left ?? 0, visibility: menuPosition ? 'visible' : 'hidden' }} />, document.body)}
      {informationEvent && <EventDetailsModal event={informationEvent} onClose={() => {
        setInformationEvent(null)
        requestAnimationFrame(() => (triggerRef.current?.isConnected ? triggerRef.current : headingRef.current)?.focus({ preventScroll: true }))
      }} />}
      {pendingInactivation && <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_inativacao_evento} backdrop="dimmed" preservePageScroll className="event-deactivation-modal" confirmLabel="Inativar" progressLabel="Inativando evento..." tone="danger" title="Tem certeza de que deseja inativar este evento?" description={<><span>O cancelamento é definitivo. Informe o motivo.</span><label className="event-create-field" htmlFor="event-cancellation-reason">Justificativa<textarea id="event-cancellation-reason" minLength={3} maxLength={1000} value={cancellationReason} onChange={event => setCancellationReason(event.target.value)} /></label></>} icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>} onCancel={() => setPendingInactivation(null)} onConfirm={async () => { await cancel(pendingInactivation.eventId ?? pendingInactivation.id, cancellationReason); return null }} onConfirmed={() => {
        setAnimateCalendar(true)
        setFeedback(`Evento ${pendingInactivation.title} inativado.`)
        setPendingInactivation(null)
        requestAnimationFrame(() => headingRef.current?.focus())
      }} />}
      {editor && <CreateEventFlowModal managerId={editor.mode === 'edit' ? editor.value.creatorId : ''} initialValue={editor.mode === 'edit' ? editor.value : undefined} mode={editor.mode} onClose={closeEditor} onSubmit={saveEvent} />}
    </div>
  )
}

function MainEventScreenPage() {
  const { user } = useAuthentication()
  return <EventScreenContent key={user?.uid ?? 'guest'} />
}

export default MainEventScreenPage
