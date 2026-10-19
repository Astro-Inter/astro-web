import { useEffect, useRef, useState } from 'react'
import { useAccessibility } from './useAccessibility'
import { useTopDialog } from './useTopDialog'
import { enableLibras, hideLibras, pauseLibras, positionLibras } from '../services/libras'

export function useLibras() {
  const { preferences, update } = useAccessibility()
  const dialog = useTopDialog()
  const containerRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef(dialog)
  const positionRef = useRef(preferences.librasPosition)
  useEffect(() => {
    dialogRef.current = dialog
    const container = containerRef.current
    if (!container || !preferences.libras) return
    ;(dialog ?? document.body).append(container)
    try { if (container.matches(':popover-open')) container.hidePopover(); container.showPopover?.() } catch { /* Compatibilidade sem Popover API. */ }
  }, [dialog, preferences.libras])
  useEffect(() => {
    positionRef.current = preferences.librasPosition
    if (preferences.libras) positionLibras(preferences.librasPosition)
  }, [preferences.librasPosition, preferences.libras])
  const [state, setState] = useState({ loading: false, error: '' })
  useEffect(() => {
    if (!preferences.libras) { hideLibras(); return }
    let active = true
    const controller = new AbortController()
    void Promise.resolve().then(() => {
      if (!active) return undefined
      setState({ loading: true, error: '' })
      return enableLibras(positionRef.current, controller.signal)
    }).then(container => {
      if (!active || !container) return
      containerRef.current = container
      positionLibras(positionRef.current)
      ;(dialogRef.current ?? document.body).append(container)
      try { if (container.matches(':popover-open')) container.hidePopover(); container.showPopover?.() } catch { /* O widget mantém sua posição nativa. */ }
      setState({ loading: false, error: '' })
    }).catch((error: unknown) => {
      if (active) { setState({ loading: false, error: error instanceof Error ? error.message : 'Não foi possível carregar o VLibras.' }); update({ libras: false }) }
    })
    return () => { active = false; controller.abort(); hideLibras() }
  }, [preferences.libras, update])
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) pauseLibras() }
    window.addEventListener('pagehide', hideLibras)
    document.addEventListener('visibilitychange', onVisibility)
    return () => { window.removeEventListener('pagehide', hideLibras); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])
  return state
}
