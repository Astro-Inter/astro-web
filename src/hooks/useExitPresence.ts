import { useEffect, useState } from 'react'

export function useExitPresence<T>(value: T, active: boolean, duration = 180) {
  const [retained, setRetained] = useState({ value, active })
  const reducedMotion = typeof window !== 'undefined' && (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.dataset.astroReducedMotion === 'true'
  )

  if (active && (!retained.active || retained.value !== value)) {
    setRetained({ value, active: true })
  }

  useEffect(() => {
    if (active || !retained.active) return
    const timer = window.setTimeout(() => setRetained({ value, active: false }), reducedMotion ? 0 : duration)
    return () => window.clearTimeout(timer)
  }, [active, value, retained.active, reducedMotion, duration])

  const exiting = !active && retained.active && !reducedMotion
  return { present: active || exiting, exiting, value: active ? value : retained.value }
}
