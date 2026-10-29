import { useEffect, useState } from 'react'
import type { CalendarEvent } from '../types/events'
import { calendarEventPeriods } from '../utils/events'

export function useEventClock(events: readonly CalendarEvent[]): number {
  const [now, setNow] = useState(Date.now)
  const boundaryKey = [...new Set(events.flatMap(event => calendarEventPeriods(event).flatMap(period => [new Date(period.startDate).getTime(), new Date(period.endDate).getTime()])))].filter(Number.isFinite).sort((a, b) => a - b).join(',')
  useEffect(() => {
    let timer: number
    const boundaries = boundaryKey ? boundaryKey.split(',').map(Number) : []
    function refresh() {
      window.clearTimeout(timer)
      const time = Date.now()
      setNow(time)
      const next = boundaries.reduce((nearest, boundary) => boundary > time ? Math.min(nearest, boundary) : nearest, Infinity)
      if (Number.isFinite(next)) timer = window.setTimeout(refresh, Math.min(2147483647, next - time + 10))
    }
    refresh()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [boundaryKey])
  return now
}
