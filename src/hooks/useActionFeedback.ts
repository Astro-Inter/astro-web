import { useCallback, useEffect, useRef } from 'react'
import { notifyAction, type ActionNoticeTone } from '../utils/actionFeedback'

/** Notifications outlive the dialog or page that completed the action. */
export function useActionFeedback(initialMessage: string | (() => string) = ''): (message: string, tone?: ActionNoticeTone) => void {
  const initial = useRef(initialMessage)
  const announced = useRef(false)
  useEffect(() => {
    if (announced.current) return
    announced.current = true
    const message = typeof initial.current === 'function' ? initial.current() : initial.current
    if (message) notifyAction(message)
  }, [])
  return useCallback((message: string, tone?: ActionNoticeTone) => notifyAction(message, tone), [])
}
