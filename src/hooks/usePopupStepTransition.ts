import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { getPopupDuration } from '../utils/popupMotion'

// Mantém o dialog e o backdrop abertos durante a troca de etapas.
export function usePopupStepTransition() {
  const transitionRef = useRef<ViewTransition | null>(null)
  const fallbackRef = useRef<Animation | null>(null)

  useEffect(() => () => {
    transitionRef.current?.skipTransition()
    fallbackRef.current?.cancel()
    document.documentElement.classList.remove('event-popup-transition')
  }, [])

  function animatePopupChange(update: () => void) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      update()
      return
    }
    if (!document.startViewTransition) {
      fallbackRef.current?.cancel()
      flushSync(update)
      const popup = document.querySelector<HTMLElement>('.event-create-modal[open], .account-replace-flow-modal[open]')
      fallbackRef.current = popup?.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: getPopupDuration('modal'),
        easing: 'cubic-bezier(.2,.8,.2,1)',
      }) ?? null
      return
    }
    // Uma nova ação substitui a animação em andamento, sem descartar o clique.
    transitionRef.current?.skipTransition()
    document.documentElement.classList.add('event-popup-transition')
    const transition = document.startViewTransition(() => flushSync(update))
    transitionRef.current = transition
    void transition.ready.catch(() => undefined)
    const finish = () => {
      if (transitionRef.current !== transition) return
      transitionRef.current = null
      document.documentElement.classList.remove('event-popup-transition')
    }
    void transition.finished.then(finish, finish)
  }

  return animatePopupChange
}
