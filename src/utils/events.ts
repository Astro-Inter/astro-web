import type { CalendarEvent } from '../types/events'

export interface CalendarDay {
  date: string
  day: number
  inCurrentMonth: boolean
}

export function monthStart(year: number, month: number): Date {
  return new Date(year, month, 1)
}

export function shiftCalendarPeriod(date: Date, view: 'week' | 'month' | 'year', amount: number): Date {
  if (view === 'week') return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7 * amount)
  const target = view === 'year'
    ? new Date(date.getFullYear() + amount, date.getMonth(), 1)
    : new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay))
}

export function weekDays(date: Date): CalendarDay[] {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay())
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return {
      date: `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`,
      day: day.getDate(),
      inCurrentMonth: day.getMonth() === date.getMonth(),
    }
  })
}

export function calendarPeriodLabel(date: Date, view: 'week' | 'month' | 'year'): string {
  if (view === 'year') return String(date.getFullYear())
  if (view === 'month') return monthLabel(date)
  const days = weekDays(date)
  const first = new Date(`${days[0].date}T12:00:00`)
  const last = new Date(`${days[6].date}T12:00:00`)
  const full = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
  const firstYear = first.getFullYear() === last.getFullYear() ? '' : ` ${first.getFullYear()}`
  return `${first.getDate()} ${full.format(first)}${firstYear} – ${last.getDate()} ${full.format(last)} ${last.getFullYear()}`.toLocaleUpperCase('pt-BR')
}

export function calendarDays(month: Date): CalendarDay[] {
  const first = monthStart(month.getFullYear(), month.getMonth())
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay())
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0)
  const weeks = Math.ceil((first.getDay() + last.getDate()) / 7)

  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    return {
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === first.getMonth(),
    }
  })
}

export function monthLabel(month: Date): string {
  const name = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(month)
  return `${name} ${month.getFullYear()}`.toLocaleUpperCase('pt-BR')
}

export function eventDateLabel(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day))
}

export function calendarEventPeriods(event: CalendarEvent): readonly { startDate: string; endDate: string }[] {
  if (event.category === 'today') return []
  if (event.eventPeriod) return [event.eventPeriod]
  if (event.configuration) {
    const schedules = event.configuration.schedules
    const schedule = schedules[event.id.split(':')[1]] ?? Object.values(schedules).find(item => item.date === event.date && item.startTime === event.startTime)
    if (schedule) return [{
      startDate: schedule.originalStart ?? `${schedule.date}T${schedule.startTime}`,
      endDate: schedule.originalEnd ?? `${schedule.endDate || schedule.date}T${schedule.endTime}`,
    }]
  }
  return [{ startDate: `${event.date}T${event.startTime}`, endDate: `${event.date}T${event.endTime}` }]
}

export function eventPeriodsInProgress(periods: readonly { startDate: string; endDate: string }[], now = Date.now()): boolean {
  return periods.some(period => new Date(period.startDate).getTime() <= now && now < new Date(period.endDate).getTime())
}

export function calendarEventInProgress(event: CalendarEvent, now = Date.now()): boolean {
  return event.category !== 'today' && !event.inactive && (!event.status || event.status === 'ATIVO') && eventPeriodsInProgress(calendarEventPeriods(event), now)
}

export function calendarEventReadOnlyReason(event: CalendarEvent, now = Date.now()): string {
  if (event.category === 'today') return ''
  if (event.inactive || event.status === 'CANCELADO') return 'Evento inativado. Disponível apenas para consulta.'
  if (event.status === 'CONCLUIDO') return 'Evento concluído. Disponível apenas para consulta.'
  if (calendarEventInProgress(event, now)) return 'Em andamento. Edição e inativação indisponíveis.'
  if (new Date(calendarEventPeriods(event)[0]?.endDate ?? `${event.date}T${event.endTime}`).getTime() <= now) return 'Prazo encerrado. Disponível apenas para consulta.'
  return ''
}
