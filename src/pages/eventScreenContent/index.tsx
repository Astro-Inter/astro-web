import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { AppSidebar, AstroIcon, CompactPurpleButton, ConfirmationModal, ToolbarSearch, ToolbarSelect } from '../../components'
import AnimatedFieldError from '../../components/animatedFieldError'
import CreateEventFlowModal from '../../components/createEventFlowModal'
import EventActionPendingModal, { type EventAction } from '../../components/eventActionPendingModal'
import EventCalendar from '../../components/eventCalendar'
import EventDetailsModal from '../../components/eventDetailsModal'
import EventOptionsModal from '../../components/eventOptionsModal'
import { BUTTONS } from '../../gtm/buttons'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { useActionFeedback } from '../../hooks/useActionFeedback'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import { useAnimatedResults } from '../../hooks/useAnimatedResults'
import { useEventClock } from '../../hooks/useEventClock'
import { detailedCalendarEvent, useEvents } from '../../hooks/useEvents'
import { useExitPresence } from '../../hooks/useExitPresence'
import type { EventConfiguration } from '../../types/eventCreation'
import type { CalendarEvent, CalendarView, EventResponse } from '../../types/events'
import { eventCancelUnavailableReason, eventEditUnavailableReason } from '../../utils/eventApi'
import { validateEventCancellation } from '../../utils/eventCancellation'
import { configurationForEvent, numberEventsByDay } from '../../utils/eventEditing'
import { calendarEventReadOnlyReason, shiftCalendarPeriod, weekDays } from '../../utils/events'

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
  const [eventAction, setEventAction] = useState<{ action: EventAction; event: CalendarEvent } | null>(null)
  const [loadedAction, setLoadedAction] = useState<{ selection: NonNullable<typeof eventAction>; data: EventResponse } | null>(null)
  const [cancellation, setCancellation] = useState({ reason: '', error: '' })
  const cancellationReason = cancellation.reason
  function setCancellationReason(reason: string) { setCancellation({ reason, error: '' }) }
  const setFeedback = useActionFeedback()
  const [creationEditor, setEditor] = useState<{ mode: 'create' } | null>(() => location.state?.openCreate === true ? { mode: 'create' } : null)
  const [savedEventId, setSavedEventId] = useState<string | null>(null)
  const [animateCalendar, setAnimateCalendar] = useState(true)
  const pendingSavedIdRef = useRef<string | null>(null)
  const saveAnimationTimerRef = useRef<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const { closing, requestClose } = useAnimatedClose()
  const { events, loading, error, retry, details, retryDetails, save, cancel } = useEvents(month, view, eventAction ? eventAction.event.eventId ?? eventAction.event.id.split(':')[0] : undefined)

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
    event.title.toLocaleLowerCase('pt-BR').includes(search),
  ), [numberedEvents, search])
  const calendarSnapshot = useMemo(() => [{ month, view, events: visibleEvents, loading }], [month, view, visibleEvents, loading])
  const calendarSignature = `${view}|${month.getTime()}|${loading}|${JSON.stringify(visibleEvents.map(event => [event.id, event.title, event.date, event.category, event.inactive, event.status, event.eventPeriod, event.eventPeriods, event.eventNumber, event.category === 'today' ? '' : event.startTime, event.category === 'today' ? '' : event.endTime]))}`
  const calendarResults = useAnimatedResults(calendarSnapshot, calendarSignature, month.getTime(), view, animateCalendar, loading, true)
  const displayedCalendar = calendarResults.items[0]
  const calendarLoading = calendarResults.exiting ? displayedCalendar.loading : loading || displayedCalendar.loading
  const eventTime = useEventClock(events)
  const selectedEntry = events.find(event => event.id === openId)
  const selected = selectedEntry
  // Mantém o conteúdo aberto estável enquanto a gravação atualiza a resposta da API.
  if (eventAction && details.data && !details.loading && loadedAction?.selection !== eventAction) {
    setLoadedAction({ selection: eventAction, data: details.data })
  }
  const actionData = loadedAction?.selection === eventAction ? loadedAction?.data : details.data
  const actionEvent = eventAction && actionData ? detailedCalendarEvent(eventAction.event, actionData) : eventAction?.event
  const actionLoading = useExitPresence(true, Boolean(eventAction && details.loading))
  const actionReady = !!eventAction && !actionLoading.present && !details.error && !!details.data
  const permissionError = actionReady && actionData
    ? eventAction.action === 'edit' ? eventEditUnavailableReason(actionData)
      : eventAction.action === 'inactivate' ? eventCancelUnavailableReason(actionData, eventTime) : ''
    : ''
  const informationEvent = actionReady && eventAction?.action === 'information' ? actionEvent : null
  const pendingInactivation = actionReady && !permissionError && eventAction?.action === 'inactivate' ? actionEvent : null
  const editor = creationEditor ?? (actionReady && !permissionError && eventAction?.action === 'edit' && actionEvent
    ? { mode: 'edit' as const, event: actionEvent, value: configurationForEvent(actionEvent) } : null)

  function closeEventAction() {
    setEventAction(null)
    requestAnimationFrame(() => (triggerRef.current?.isConnected ? triggerRef.current : headingRef.current)?.focus({ preventScroll: true }))
  }

  function requestEventAction(action: EventAction, event: CalendarEvent) {
    if (action !== 'information' && calendarEventReadOnlyReason(event)) return
    closeMenu(() => {
      setCancellationReason('')
      setEventAction({ action, event })
    }, false)
  }
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
    if (editor.mode === 'edit') {
      const reason = details.data ? eventEditUnavailableReason(details.data) : 'Não foi possível carregar os dados do evento.'
      if (reason) throw new Error(reason)
    }
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
    setEventAction(null)
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
      (triggerRef.current?.isConnected ? triggerRef.current : headingRef.current)?.focus({ preventScroll: true })
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
          {error && <div role="alert"><p>{error}</p><button className="astro-modal-cancel" onClick={retry} type="button">Tentar novamente</button></div>}
          {!calendarLoading && !error && !calendarResults.exiting && visiblePeriodCount === 0 && <p role="status">Nenhum evento encontrado neste período.</p>}
          <div className="event-board">
            <div aria-busy={loading || calendarResults.exiting} className={`event-calendar-transition${calendarResults.changed ? ' event-calendar-transition--animated' : ''}${calendarResults.direction ? ` event-calendar-transition--${calendarResults.direction}` : ''}${calendarResults.exiting ? ' event-calendar-transition--exiting' : ''}`}>
              <EventCalendar now={eventTime} loading={calendarLoading} events={displayedCalendar.events} month={displayedCalendar.month} view={displayedCalendar.view} onMonthChange={amount => changeCalendar(() => { setOpenId(null); setMonth(current => shiftCalendarPeriod(current, view, amount)) })} onOpenOptions={openOptions} selectedEventId={openId} savedEventId={savedEventId} />
            </div>
          </div>
          {!calendarLoading && !calendarResults.exiting && <p className="sr-only" role="status">{visiblePeriodCount} eventos visíveis neste período.</p>}
        </section>
      </main>
      {selected && createPortal(<EventOptionsModal now={eventTime} closing={closing} event={selected} onClose={() => closeMenu()} onViewInformation={() => requestEventAction('information', selected)} onEdit={() => requestEventAction('edit', selected)} onInactivate={() => requestEventAction('inactivate', selected)} panelRef={panelRef} style={{ top: menuPosition?.top ?? 0, left: menuPosition?.left ?? 0, visibility: menuPosition ? 'visible' : 'hidden' }} />, document.body)}
      {eventAction && (!actionReady || permissionError) && <EventActionPendingModal action={eventAction.action} loading={actionLoading.present} exiting={actionLoading.exiting} error={details.error || permissionError || 'Não foi possível carregar os dados do evento.'} onClose={closeEventAction} onRetry={permissionError ? undefined : retryDetails} />}
      <div className={eventAction ? 'event-action-resolved' : undefined}>
      {informationEvent && <EventDetailsModal event={informationEvent} onClose={closeEventAction} />}
      {pendingInactivation && <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_inativacao_evento} backdrop="dimmed" preservePageScroll className="event-deactivation-modal" confirmLabel="Inativar" progressLabel="Inativando evento..." tone="danger" title="Tem certeza de que deseja inativar este evento?" description={<><span>O cancelamento é definitivo. Informe o motivo.</span><label className="event-create-field" htmlFor="event-cancellation-reason">Justificativa<textarea id="event-cancellation-reason" minLength={3} maxLength={1000} value={cancellationReason} aria-invalid={!!cancellation.error} aria-describedby={cancellation.error ? "event-cancellation-error" : undefined} onChange={event => setCancellationReason(event.target.value)} /></label><AnimatedFieldError id="event-cancellation-error" message={cancellation.error} /></>} icon={<span aria-hidden="true" className="position-deactivation-icon"><AstroIcon name="warning" /></span>} onCancel={closeEventAction} validate={() => {
        const validation = validateEventCancellation(cancellationReason)
        setCancellation(current => ({ ...current, error: validation.errors.reason || '' }))
        if (!validation.values) document.getElementById('event-cancellation-reason')?.focus()
        return !!validation.values
      }} onConfirm={async () => { if (!details.data) throw new Error('Não foi possível carregar os dados do evento.'); const reason = eventCancelUnavailableReason(details.data); if (reason) throw new Error(reason); await cancel(pendingInactivation.eventId ?? pendingInactivation.id, validateEventCancellation(cancellationReason).values!.reason); return null }} onConfirmed={() => {
        setAnimateCalendar(true)
        setFeedback(`Evento ${pendingInactivation.title} inativado.`)
        setEventAction(null)
        requestAnimationFrame(() => headingRef.current?.focus())
      }} />}
      {editor && <CreateEventFlowModal managerId={editor.mode === 'edit' ? editor.value.creatorId : ''} initialValue={editor.mode === 'edit' ? editor.value : undefined} mode={editor.mode} onClose={closeEditor} onSubmit={saveEvent} />}
      </div>
    </div>
  )
}
export default EventScreenContent
