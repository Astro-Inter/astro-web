import { useEffect, useRef, useState } from 'react'
import { useAuthentication } from './useAuthentication'
import { cancelEvent, createEvent, getEvent, listEvents, updateEvent } from '../services/events'
import { calendarFromApi, eventCalendarRange, eventConfiguration } from '../utils/eventApi'
import type { CalendarEvent, CalendarView, EventResponse } from '../types/events'
import type { EventConfiguration } from '../types/eventCreation'

interface CalendarState { key: string; rows: CalendarEvent[]; loading: boolean; error: string }
interface DetailsState { key: string; data: EventResponse | null; loading: boolean; error: string }
interface EventsResult {
  events: CalendarEvent[]; loading: boolean; error: string; retry: () => void
  details: Omit<DetailsState, 'key'>; retryDetails: () => void
  save: (value: EventConfiguration, id?: string) => Promise<EventResponse>
  cancel: (id: string, reason: string) => Promise<void>
}
const message = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível carregar os eventos. Tente novamente.'

export function useEvents(date: Date, view: CalendarView, selectedEventId?: string): EventsResult {
  const { user } = useAuthentication()
  const uid = user?.uid
  const { startDate, endDate } = eventCalendarRange(date, view)
  const [attempts, setAttempts] = useState({ calendar: 0, details: 0 })
  const key = `${uid ?? ''}/${startDate}/${endDate}/${attempts.calendar}`
  const detailKey = `${uid ?? ''}/${selectedEventId ?? ''}/${attempts.details}`
  const [state, setState] = useState<CalendarState>({ key: '', rows: [], loading: true, error: '' })
  const [detailState, setDetails] = useState<DetailsState>({ key: '', data: null, loading: true, error: '' })
  const mutation = useRef<AbortController | null>(null)
  if (!selectedEventId && detailState.key !== detailKey) setDetails({ key: detailKey, data: null, loading: false, error: '' })

  useEffect(() => () => { mutation.current?.abort(); mutation.current = null }, [uid])
  useEffect(() => {
    const controller = new AbortController()
    if (!uid) return () => controller.abort()
    listEvents(startDate, endDate, controller.signal).then(rows => {
      if (!controller.signal.aborted) setState({ key, rows: calendarFromApi(rows, startDate, endDate), loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setState({ key, rows: [], loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, key, startDate, endDate])

  useEffect(() => {
    const controller = new AbortController()
    if (!uid || !selectedEventId) return () => controller.abort()
    getEvent(selectedEventId, controller.signal).then(data => {
      if (!controller.signal.aborted) setDetails({ key: detailKey, data, loading: false, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setDetails({ key: detailKey, data: null, loading: false, error: message(error) })
    })
    return () => controller.abort()
  }, [uid, selectedEventId, detailKey])

  async function mutate(operation: (signal: AbortSignal) => Promise<EventResponse>): Promise<EventResponse> {
    if (mutation.current) throw new Error('Aguarde a operação em andamento.')
    const controller = new AbortController()
    mutation.current = controller
    try {
      const data = await operation(controller.signal)
      controller.signal.throwIfAborted()
      // A resposta persistida é a fonte das permissões e da programação.
      setDetails({ key: detailKey, data, loading: false, error: '' })
      setAttempts(current => ({ ...current, calendar: current.calendar + 1 }))
      return data
    } finally { if (mutation.current === controller) mutation.current = null }
  }

  return {
    events: state.key === key ? state.rows : [], loading: state.key !== key || state.loading, error: state.key === key ? state.error : '',
    retry: () => setAttempts(current => ({ ...current, calendar: current.calendar + 1 })),
    details: detailState.key === detailKey ? detailState : { data: null, loading: !!selectedEventId, error: '' },
    retryDetails: () => setAttempts(current => ({ ...current, details: current.details + 1 })),
    save: (value, id) => mutate(signal => id ? updateEvent(id, value, signal) : createEvent(value, signal)),
    cancel: async (id, reason) => { await mutate(signal => cancelEvent(id, reason, signal)) },
  }
}

export function detailedCalendarEvent(event: CalendarEvent, detail: EventResponse): CalendarEvent {
  return { ...event, title: detail.title, inactive: detail.status === 'CANCELADO', status: detail.status, configuration: eventConfiguration(detail) }
}
