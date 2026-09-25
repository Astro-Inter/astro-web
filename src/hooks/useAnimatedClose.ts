import { useCallback, useEffect, useRef, useState } from 'react'

export function useAnimatedClose(duration = 180) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  const requestClose = useCallback((onFinished: () => void) => {
    if (closingRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onFinished()
      return
    }

    closingRef.current = true
    setClosing(true)
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null
      closingRef.current = false
      setClosing(false)
      onFinished()
    }, duration)
  }, [duration])

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
  }, [])

  return { closing, requestClose }
}
