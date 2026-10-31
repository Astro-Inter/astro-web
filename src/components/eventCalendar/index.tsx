import { useEventClock } from '../../hooks/useEventClock'
import { useExitPresence } from '../../hooks/useExitPresence'
import { useCurrentCalendarDate } from '../../hooks/useCurrentCalendarDate'
import { SHOWCASE_NAMES } from '../../gtm/showcases'
import { BUTTONS } from '../../gtm/buttons'
import { useLayoutEffect, useRef } from 'react'
import AstroIcon from '../astroIcon'
import type { CalendarEvent, CalendarView } from '../../types/events'
import { calendarDays, calendarPeriodLabel, eventDateLabel, weekDays, calendarEventInProgress, calendarEventReadOnlyReason } from '../../utils/events'

interface EventCalendarProps {
  events: readonly CalendarEvent[]
  month: Date
  view: CalendarView
  onMonthChange: (amount: number) => void
  onOpenOptions: (event: CalendarEvent, trigger: HTMLButtonElement) => void
  selectedEventId: string | null
  savedEventId?: string | null
  loading?: boolean
  now?: number
}

const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const hours = Array.from({ length: 24 }, (_, index) => index)

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function eventOccursInHour(event: CalendarEvent, hour: number) {
  if (event.category === 'today') return true
  const firstHour = Math.floor(timeToMinutes(event.startTime) / 60)
  const lastHour = Math.min(23, Math.floor(timeToMinutes(event.endTime) / 60))
  return hour >= firstHour && hour <= lastHour
}

function EventCalendar({ events, month, view, onMonthChange, onOpenOptions, selectedEventId, savedEventId, loading: requestedLoading = false, now: suppliedNow }: EventCalendarProps) {
  const clock = useEventClock(events, suppliedNow === undefined)
  const now = suppliedNow ?? clock
  const today = useCurrentCalendarDate()
  const currentDayMarker: CalendarEvent = { id: `calendar-today-${today}`, category: 'today', date: today, title: 'Dia atual' }
  const presence = useExitPresence(true, requestedLoading)
  const loading = presence.present
  const contentLoading = view === 'week' ? requestedLoading : loading
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekPositionRef = useRef<{ period: string; positioned: boolean; interacted: boolean } | null>(null)
  const days = view === 'week' ? weekDays(month) : calendarDays(month)
  const period = view === 'week' ? 'Semana' : view === 'year' ? 'Ano' : 'Mês'
  const label = calendarPeriodLabel(month, view)
  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const event of contentLoading ? [] : events) {
    if (event.category === 'today') continue
    const dailyEvents = eventsByDate.get(event.date) ?? []
    dailyEvents.push(event)
    eventsByDate.set(event.date, dailyEvents)
  }

  const weekStart = days[0]?.date
  useLayoutEffect(() => {
    if (!scrollRef.current) return
    if (view !== 'week') {
      weekPositionRef.current = null
      scrollRef.current.scrollTop = 0
      return
    }
    const firstRow = scrollRef.current.querySelector('.event-week-table tbody tr')
    if (!firstRow) return
    if (weekPositionRef.current?.period !== weekStart) {
      weekPositionRef.current = { period: weekStart, positioned: false, interacted: false }
      scrollRef.current.scrollTop = firstRow.getBoundingClientRect().height * 8
    }
    const position = weekPositionRef.current
    if (requestedLoading || position.positioned || position.interacted) return
    const firstEventStart = events
      .filter(event => event.category !== 'today' && weekDays(month).some(day => day.date === event.date))
      .reduce<number | null>((earliest, event) => {
        if (event.category === 'today') return earliest
        const start = timeToMinutes(event.startTime)
        return earliest === null ? start : Math.min(earliest, start)
      }, null)
    const startingHour = firstEventStart === null ? 8 : Math.max(0, Math.floor(firstEventStart / 60) - 1)
    scrollRef.current.scrollTop = firstRow.getBoundingClientRect().height * startingHour
    position.positioned = true
  }, [events, month, view, weekStart, requestedLoading])

  function preserveWeekPosition() {
    if (view === 'week' && weekPositionRef.current) weekPositionRef.current.interacted = true
  }

  function eventItem(event: CalendarEvent, miniature = false, weekly = false) {
    const inProgress = calendarEventInProgress(event, now)
    const readOnlyReason = calendarEventReadOnlyReason(event, now)
    const timedEvent = event.category === 'today' ? null : event
    const eventLabel = event.category === 'today' ? 'Dia atual' : event.title
    const itemClass = `event-calendar-item event-calendar-item--${event.category}${event.category !== 'today' ? ` event-calendar-item--color-${((event.eventNumber ?? 1) - 1) % 4}` : ''}${event.inactive ? ' event-calendar-item--inactive' : ''}${inProgress ? ' event-calendar-item--in-progress' : ''}${readOnlyReason ? ' event-calendar-item--read-only' : ''}${miniature ? ' event-calendar-item--miniature' : ' event-loading-ready'}${weekly ? ' event-calendar-item--weekly' : ''}${savedEventId === (event.eventId ?? event.id) ? ' event-calendar-item--saved' : ''}`
    const itemLabel = `${eventLabel}${event.inactive ? ', inativo' : ''}${readOnlyReason ? `, ${readOnlyReason.toLocaleLowerCase('pt-BR')}` : ''}, ${eventDateLabel(event.date)}${timedEvent ? `, das ${timedEvent.startTime} às ${timedEvent.endTime}` : ''}`
    const itemContent = miniature ? null : <span className="event-calendar-item-label">{eventLabel}</span>

    if (event.category === 'today') return <span
      aria-label={miniature ? itemLabel : undefined}
      className={`${itemClass} event-calendar-item--static`}
      key={event.id}
      role={miniature ? 'img' : undefined}
      title={`${event.title}${event.inactive ? ' — Inativo' : ''}${readOnlyReason ? ` — ${readOnlyReason}` : ''}`}
    >{itemContent}</span>

    return <button data-track-item={BUTTONS.comuns.evento}
      aria-controls={selectedEventId === event.id ? `event-options-${event.id}` : undefined}
      aria-expanded={selectedEventId === event.id}
      aria-haspopup="menu"
      aria-label={itemLabel}
      className={itemClass}
      key={event.id}
      onClick={click => onOpenOptions(event, click.currentTarget)}
      title={`${event.title}${event.inactive ? ' — Inativo' : ''}${readOnlyReason ? ` — ${readOnlyReason}` : ''}`}
      type="button"
    >{itemContent}</button>
  }

  return (
    <section data-track-showcase={SHOWCASE_NAMES.calendario_eventos} aria-busy={contentLoading} aria-label={`Calendário de ${label}`} className={`event-calendar-panel event-calendar-panel--${view}`}>
      {contentLoading && <span className="sr-only" role="status">Carregando eventos...</span>}
      <div className="event-calendar-heading">
        <button data-track-action={BUTTONS.comuns.periodo_anterior} aria-label={`${period} anterior`} className="event-month-arrow event-month-arrow--previous" onClick={() => onMonthChange(-1)} type="button"><AstroIcon name="chevron-left" /></button>
        <h2 aria-live="polite">{label}</h2>
        <button data-track-action={BUTTONS.comuns.proximo_periodo} aria-label={view === 'week' ? 'Próxima semana' : `Próximo ${period.toLocaleLowerCase('pt-BR')}`} className="event-month-arrow event-month-arrow--next" onClick={() => onMonthChange(1)} type="button"><AstroIcon name="chevron-right" /></button>
      </div>
      <div aria-label={`Conteúdo do calendário de ${label}`} role="region" tabIndex={0} className={`event-calendar-scroll${view === 'year' ? presence.exiting ? ' event-loading-exit' : !loading ? ' event-loading-ready' : '' : ''}`} ref={scrollRef} onWheel={preserveWeekPosition} onTouchMove={preserveWeekPosition} onPointerDown={preserveWeekPosition} onKeyDown={event => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) preserveWeekPosition()
      }}>
        {view === 'week' ? <table aria-hidden={contentLoading || undefined} className="event-week-table">
          <thead><tr><th scope="col">Horário</th>{days.map((day, index) => <th key={day.date} scope="col" className={day.date === today ? 'event-week-day--today' : undefined} aria-current={day.date === today ? 'date' : undefined}>{weekdays[index]} <span className="event-week-day-number">{day.day}{day.date === today && <small className="event-current-day-label">Hoje</small>}</span></th>)}</tr></thead>
          <tbody>{hours.map(hour => <tr key={hour}>
            <th scope="row">{String(hour).padStart(2, '0')}:00</th>
            {days.map((day, dayIndex) => {
              const hourlyEvents = (eventsByDate.get(day.date) ?? []).filter(event => eventOccursInHour(event, hour))
              return <td key={day.date} className={day.date === today ? 'event-week-cell--today' : undefined}>
                <div aria-label={hourlyEvents.length > 2 ? `Eventos de ${eventDateLabel(day.date)} às ${String(hour).padStart(2, '0')}:00` : undefined} className="event-week-cell-events" role={hourlyEvents.length > 2 ? 'region' : undefined} tabIndex={hourlyEvents.length > 2 ? 0 : undefined}>
                  {presence.present && <div aria-hidden="true" className={`event-week-cell-skeleton${presence.exiting ? ' event-loading-exit' : ''}`}>
                    <span className="api-skeleton event-calendar-skeleton-item" />
                    {(hour + dayIndex) % 3 === 0 && <span className="api-skeleton event-calendar-skeleton-item" />}
                  </div>}
                  {!requestedLoading && hourlyEvents.map(event => eventItem(event, false, true))}
                </div>
              </td>
            })}
          </tr>)}</tbody>
        </table> : view === 'year' ? <div aria-hidden={loading || undefined} className="event-year-grid">
          {Array.from({ length: 12 }, (_, index) => {
            const date = new Date(month.getFullYear(), index, 1)
            const name = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date)
            return <section aria-label={`${name} de ${month.getFullYear()}`} className="event-year-month" key={index}>
              <h3>{name}</h3>
              <div className="event-year-days">
                {weekdays.map((day, dayIndex) => <span className="event-year-weekday" key={dayIndex}>{day.slice(0, 1)}</span>)}
                {calendarDays(date).map(day => <div className={`event-year-day${day.inCurrentMonth ? '' : ' event-year-day--outside'}${day.inCurrentMonth && day.date === today ? ' event-year-day--today' : ''}`} aria-current={day.inCurrentMonth && day.date === today ? 'date' : undefined} aria-label={day.inCurrentMonth && day.date === today ? `Hoje, ${eventDateLabel(day.date)}` : undefined} key={day.date}>
                  {loading && day.inCurrentMonth && day.date !== today ? <span className="api-skeleton event-year-skeleton-day" /> : day.inCurrentMonth ? day.day : ''}
                  {day.inCurrentMonth && <div className="event-year-day-events">{loading ? day.day % 3 === 2 && <span className="api-skeleton event-calendar-skeleton-marker" /> : (eventsByDate.get(day.date) ?? []).slice(0, 3).map(event => eventItem(event, true))}</div>}
                </div>)}
              </div>
            </section>
          })}
        </div> :
        <table aria-hidden={loading || undefined} className="event-calendar-table">
          <thead><tr>{weekdays.map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
          <tbody>
            {Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7)).map(week => (
              <tr key={week[0].date}>
                {week.map(day => (
                  <td className={`${day.inCurrentMonth ? '' : 'event-calendar-day--outside'}${(eventsByDate.get(day.date)?.length ?? 0) > 1 ? ' event-calendar-day--stacked' : ''}${day.date === today ? ' event-calendar-day--today' : ''}`} aria-current={day.date === today ? 'date' : undefined} key={day.date}>
                    <span className="event-calendar-day-number">{day.day}</span>
                    <div className="event-calendar-day-events" role={(eventsByDate.get(day.date)?.length ?? 0) + Number(day.date === today) > 3 ? 'region' : undefined} aria-label={(eventsByDate.get(day.date)?.length ?? 0) + Number(day.date === today) > 3 ? `Eventos de ${eventDateLabel(day.date)}` : undefined} tabIndex={(eventsByDate.get(day.date)?.length ?? 0) + Number(day.date === today) > 3 ? 0 : undefined}>
                      {day.date === today && eventItem(currentDayMarker)}
                      {loading ? day.inCurrentMonth && <>
                        <span className={`api-skeleton event-calendar-skeleton-item${presence.exiting ? ' event-loading-exit' : ''}`} />
                        {day.day % 3 === 0 && <span className={`api-skeleton event-calendar-skeleton-item event-calendar-skeleton-item--short${presence.exiting ? ' event-loading-exit' : ''}`} />}
                      </> : (eventsByDate.get(day.date) ?? []).map(event => eventItem(event))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>}
      </div>
    </section>
  )
}

export default EventCalendar
