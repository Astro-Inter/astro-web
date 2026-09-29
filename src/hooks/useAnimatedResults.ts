import { useEffect, useState } from 'react'

// Keep the outgoing results mounted until their exit finishes.
export function useAnimatedResults<T>(items: readonly T[], signature: string, page = 1, group = '') {
  const [displayed, setDisplayed] = useState({ items, signature, page, group, direction: '', changed: false })
  const exiting = displayed.signature !== signature
  const direction = group === displayed.group && page !== displayed.page ? (page > displayed.page ? 'next' : 'previous') : ''

  useEffect(() => {
    if (displayed.signature === signature) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setDisplayed({ items, signature, page, group, direction, changed: true }), reducedMotion ? 0 : 180)
    return () => window.clearTimeout(timer)
  }, [items, signature, displayed.signature, page, group, direction])

  return { items: displayed.items, signature: displayed.signature, exiting, changed: displayed.changed || exiting, direction: exiting ? direction : displayed.direction }
}
