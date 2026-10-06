import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAnimatedClose } from './useAnimatedClose'

export function useActionsMenu() {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const queuedOpenRef = useRef<(() => void) | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const { closing, requestClose } = useAnimatedClose()

  const close = useCallback((onFinished?: () => void, restoreFocus = true) => {
    requestClose(() => {
      setOpenId(null)
      const queuedOpen = queuedOpenRef.current
      if (restoreFocus && !queuedOpen) triggerRef.current?.focus()
      const nextAction = queuedOpen ?? onFinished
      queuedOpenRef.current = null
      nextAction?.()
    })
  }, [requestClose])

  useEffect(() => {
    if (!openId) return

    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest('.position-actions-trigger')) return
      if (!panelRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) close(undefined, false)
    }
    function closeOnScroll() { close() }

    window.addEventListener('pointerdown', closeOutside)
    window.addEventListener('scroll', closeOnScroll, true)
    window.addEventListener('resize', closeOnScroll)
    return () => {
      window.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('scroll', closeOnScroll, true)
      window.removeEventListener('resize', closeOnScroll)
    }
  }, [close, openId])

  useLayoutEffect(() => {
    if (!openId || !triggerRef.current || !panelRef.current) return

    const trigger = triggerRef.current.getBoundingClientRect()
    const panel = panelRef.current.getBoundingClientRect()
    const margin = 8
    const below = trigger.bottom + margin
    const top = below + panel.height <= window.innerHeight - margin ? below : trigger.top - panel.height - margin

    setMenuPosition({
      top: Math.max(margin, Math.min(top, window.innerHeight - panel.height - margin)),
      left: Math.max(margin, Math.min(trigger.right - panel.width, window.innerWidth - panel.width - margin)),
    })
  }, [openId])

  function toggle(id: string, trigger: HTMLButtonElement) {
    const open = () => {
      triggerRef.current = trigger
      setMenuPosition(null)
      setOpenId(id)
    }

    if (!openId) open()
    else if (openId === id) close()
    else if (closing) queuedOpenRef.current = open
    else close(open, false)
  }

  return {
    close,
    closing,
    openId,
    panelRef,
    style: { top: menuPosition?.top ?? 0, left: menuPosition?.left ?? 0, visibility: menuPosition ? 'visible' as const : 'hidden' as const },
    toggle,
    triggerRef,
  }
}
