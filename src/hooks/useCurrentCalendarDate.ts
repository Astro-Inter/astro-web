import { useEffect, useState } from 'react'

function localDateKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function useCurrentCalendarDate(): string {
  const [date, setDate] = useState(localDateKey)
  useEffect(() => {
    let timer: number
    function schedule() {
      window.clearTimeout(timer)
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      timer = window.setTimeout(refresh, midnight.getTime() - now.getTime() + 50)
    }
    function refresh() { setDate(localDateKey()); schedule() }
    schedule()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  return date
}
