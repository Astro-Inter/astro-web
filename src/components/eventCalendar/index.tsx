import { useLayoutEffect, useRef } from 'react'
import AstroIcon from '../astroIcon'
import { eventCategoryLabels } from '../../data/events'
import type { CalendarEvent, CalendarView } from '../../types/events'
import { calendarDays, calendarPeriodLabel, eventDateLabel, weekDays } from '../../utils/events'

interface EventCalendarProps {
  events: readonly CalendarEvent[]
  month: Date
  view: CalendarView
  onMonthChange: (amount: number) => void
  onOpenOptions: (event: CalendarEvent, trigger: HTMLButtonElement) => void
  selectedEventId: string | null
  savedEventId?: string | null
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

function EventCalendar({ events, month, view, onMonthChange, onOpenOptions, selectedEventId, savedEventId }: EventCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const days = view === 'week' ? weekDays(month) : calendarDays(month)
  const period = view === 'week' ? 'Semana' : view === 'year' ? 'Ano' : 'Mês'
  const label = calendarPeriodLabel(month, view)
  const eventsByDate = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const dailyEvents = eventsByDate.get(event.date) ?? []
    dailyEvents.push(event)
    eventsByDate.set(event.date, dailyEvents)
  }

  const weekStart = days[0]?.date
  useLayoutEffect(() => {
    if (view !== 'week' || !scrollRef.current) return
    const firstRow = scrollRef.current.querySelector('.event-week-table tbody tr')
    if (!firstRow) return
    const firstEventStart = events
      .filter(event => event.category !== 'today' && weekDays(month).some(day => day.date === event.date))
      .reduce<number | null>((earliest, event) => {
        if (event.category === 'today') return earliest
        const start = timeToMinutes(event.startTime)
        return earliest === null ? start : Math.min(earliest, start)
      }, null)
    const startingHour = firstEventStart === null ? 8 : Math.max(0, Math.floor(firstEventStart / 60) - 1)
    scrollRef.current.scrollTop = firstRow.getBoundingClientRect().height * startingHour
  }, [events, month, view, weekStart])

  function eventItem(event: CalendarEvent, miniature = false, weekly = false) {
    const timedEvent = event.category === 'today' ? null : event
    const eventLabel = event.category === 'today' ? eventCategoryLabels.today : `Evento ${event.eventNumber ?? 1}`
    const itemClass = `event-calendar-item event-calendar-item--${event.category}${event.category !== 'today' ? ` event-calendar-item--color-${((event.eventNumber ?? 1) - 1) % 4}` : ''}${event.inactive ? ' event-calendar-item--inactive' : ''}${miniature ? ' event-calendar-item--miniature' : ''}${weekly ? ' event-calendar-item--weekly' : ''}${savedEventId === (event.eventId ?? event.id) ? ' event-calendar-item--saved' : ''}`
    const itemLabel = `${eventLabel}${event.inactive ? ', inativo' : ''}: ${event.title}, ${eventDateLabel(event.date)}${timedEvent ? `, das ${timedEvent.startTime} às ${timedEvent.endTime}` : ''}`
    const itemContent = miniature ? null : <span className="event-calendar-item-label">{eventLabel}</span>

    if (event.category === 'today') return <span
      aria-label={miniature ? itemLabel : undefined}
      className={`${itemClass} event-calendar-item--static`}
      key={event.id}
      role={miniature ? 'img' : undefined}
      title={`${event.title}${event.inactive ? ' — Inativo' : ''}`}
    >{itemContent}</span>

    return <button
      aria-controls={selectedEventId === event.id ? `event-options-${event.id}` : undefined}
      aria-expanded={selectedEventId === event.id}
      aria-haspopup="menu"
      aria-label={itemLabel}
      className={itemClass}
      key={event.id}
      onClick={click => onOpenOptions(event, click.currentTarget)}
      title={`${event.title}${event.inactive ? ' — Inativo' : ''}`}
      type="button"
    >{itemContent}</button>
  }

  return (
    <section aria-label={`Calendário de ${label}`} className={`event-calendar-panel event-calendar-panel--${view}`}>
      <div className="event-calendar-heading">
        <button aria-label={`${period} anterior`} className="event-month-arrow event-month-arrow--previous" onClick={() => onMonthChange(-1)} type="button"><AstroIcon name="chevron-left" /></button>
        <h2 aria-live="polite">{label}</h2>
        <button aria-label={view === 'week' ? 'Próxima semana' : `Próximo ${period.toLocaleLowerCase('pt-BR')}`} className="event-month-arrow event-month-arrow--next" onClick={() => onMonthChange(1)} type="button"><AstroIcon name="chevron-right" /></button>
      </div>
      <div className="event-calendar-scroll" ref={scrollRef}>
        {view === 'week' ? <table className="event-week-table">
          <thead><tr><th scope="col">Horário</th>{days.map((day, index) => <th key={day.date} scope="col">{weekdays[index]} <span>{day.day}</span></th>)}</tr></thead>
          <tbody>{hours.map(hour => <tr key={hour}>
            <th scope="row">{String(hour).padStart(2, '0')}:00</th>
            {days.map(day => {
              const hourlyEvents = (eventsByDate.get(day.date) ?? []).filter(event => eventOccursInHour(event, hour))
              return <td key={day.date}>
                <div aria-label={hourlyEvents.length > 2 ? `Eventos de ${eventDateLabel(day.date)} às ${String(hour).padStart(2, '0')}:00` : undefined} className="event-week-cell-events" role={hourlyEvents.length > 2 ? 'region' : undefined} tabIndex={hourlyEvents.length > 2 ? 0 : undefined}>
                  {hourlyEvents.map(event => eventItem(event, false, true))}
                </div>
              </td>
            })}
          </tr>)}</tbody>
        </table> : view === 'year' ? <div className="event-year-grid">
          {Array.from({ length: 12 }, (_, index) => {
            const date = new Date(month.getFullYear(), index, 1)
            const name = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date)
            return <section aria-label={`${name} de ${month.getFullYear()}`} className="event-year-month" key={index}>
              <h3>{name}</h3>
              <div className="event-year-days">
                {weekdays.map((day, dayIndex) => <span className="event-year-weekday" key={dayIndex}>{day.slice(0, 1)}</span>)}
                {calendarDays(date).map(day => <div className={`event-year-day${day.inCurrentMonth ? '' : ' event-year-day--outside'}`} key={day.date}>
                  {day.inCurrentMonth ? day.day : ''}
                  {day.inCurrentMonth && <div className="event-year-day-events">{(eventsByDate.get(day.date) ?? []).map(event => eventItem(event, true))}</div>}
                </div>)}
              </div>
            </section>
          })}
        </div> :
        <table className="event-calendar-table">
          <thead><tr>{weekdays.map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
          <tbody>
            {Array.from({ length: days.length / 7 }, (_, index) => days.slice(index * 7, index * 7 + 7)).map(week => (
              <tr key={week[0].date}>
                {week.map(day => (
                  <td className={`${day.inCurrentMonth ? '' : 'event-calendar-day--outside'}${(eventsByDate.get(day.date)?.length ?? 0) > 1 ? ' event-calendar-day--stacked' : ''}`} key={day.date}>
                    <span className="event-calendar-day-number">{day.day}</span>
                    <div className="event-calendar-day-events">
                      {(eventsByDate.get(day.date) ?? []).map(event => eventItem(event))}
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
