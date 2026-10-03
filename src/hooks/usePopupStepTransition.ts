import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

// Compartilha o crossfade das etapas de eventos, sem fechar o dialog ou seu backdrop.
export function usePopupStepTransition() {
  const transitionRef = useRef<ViewTransition | null>(null)

  useEffect(() => () => {
    transitionRef.current?.skipTransition()
    document.documentElement.classList.remove('event-popup-transition')
  }, [])

  function animatePopupChange(update: () => void) {
    if (transitionRef.current) return
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update()
      return
    }
    document.documentElement.classList.add('event-popup-transition')
    const transition = document.startViewTransition(() => flushSync(update))
    transitionRef.current = transition
    void transition.ready.catch(() => undefined)
    void transition.finished.then(() => {
      transitionRef.current = null
      document.documentElement.classList.remove('event-popup-transition')
    })
  }

  return animatePopupChange
}
