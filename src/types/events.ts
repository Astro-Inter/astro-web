import type { EventConfiguration } from './eventCreation'

export type EventCategory = 'today' | 'event'
export type CalendarView = 'week' | 'month' | 'year'

interface CalendarEventBase {
  id: string
  date: string
  title: string
  eventId?: string
  configuration?: EventConfiguration
  eventNumber?: number
  inactive?: boolean
}

export type CalendarEvent = CalendarEventBase & (
  | { category: 'today' }
  | { category: Exclude<EventCategory, 'today'>; startTime: string; endTime: string }
)
