export type EventCategory = 'today' | 'commitment' | 'reminder'
export type CalendarView = 'week' | 'month' | 'year'

interface CalendarEventBase {
  id: string
  date: string
  title: string
}

export type CalendarEvent = CalendarEventBase & (
  | { category: 'today' }
  | { category: Exclude<EventCategory, 'today'>; startTime: string; endTime: string }
)
