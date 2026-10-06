import { useCallback, useEffect, useRef, useState } from 'react'
import { getPopupDuration, type PopupMotionKind } from '../utils/popupMotion'

export function useAnimatedClose(duration: number | PopupMotionKind = 'popover') {
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
    }, typeof duration === 'number' ? duration : getPopupDuration(duration))
  }, [duration])

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
  }, [])

  return { closing, requestClose }
}
