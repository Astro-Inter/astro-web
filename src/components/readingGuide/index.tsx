import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTopDialog } from '../../hooks/useTopDialog'

function ReadingGuide() {
  const ref = useRef<HTMLDivElement>(null)
  const dialog = useTopDialog()
  useEffect(() => {
    const guide = ref.current
    if (!guide) return
    let frame = 0
    let y = window.innerHeight / 2
    let followFocus = false
    const update = () => {
      frame = 0
      const bounds = guide.getBoundingClientRect()
      const zoom = bounds.width / Math.max(1, guide.offsetWidth) || 1
      guide.style.width = `${window.innerWidth / zoom}px`
      guide.style.height = `${32 / zoom}px`
      const current = guide.getBoundingClientRect()
      const top = Math.max(0, Math.min(window.innerHeight - 32, y - 16))
      guide.style.top = `${(Number.parseFloat(guide.style.top) || 0) + (top - current.top) / zoom}px`
    }
    const schedule = (position: number) => { y = position; if (!frame) frame = requestAnimationFrame(update) }
    const focusTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement) || target === document.body || target === document.documentElement) return
      const bounds = target.getBoundingClientRect()
      followFocus = true
      schedule(bounds.top + bounds.height / 2)
    }
    const pointer = (event: PointerEvent) => { followFocus = false; schedule(event.clientY) }
    const focus = (event: FocusEvent) => focusTarget(event.target)
    const scroll = () => { if (followFocus) focusTarget(document.activeElement) }
    const resize = () => { if (followFocus) focusTarget(document.activeElement); else schedule(y) }
    update()
    try { guide.showPopover?.() } catch { /* O overlay também funciona sem Popover API. */ }
    focusTarget(document.activeElement)
    window.addEventListener('pointermove', pointer, { passive: true })
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', resize)
    document.addEventListener('focusin', focus)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', pointer); window.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', resize); document.removeEventListener('focusin', focus) }
  }, [dialog])
  return createPortal(<div aria-hidden="true" className="a11y-reading-guide" popover="manual" ref={ref} />, dialog ?? document.body)
}

export default ReadingGuide
