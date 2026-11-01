import { useEffect, useState } from 'react'
import type { VoiceInputElement, VoiceInputTarget } from '../types/voiceInput'
import { canUseVoiceInput, voiceInputLabel } from '../utils/voiceInput'

export function useVoiceInputTargets(): readonly VoiceInputTarget[] {
  const [targets, setTargets] = useState<VoiceInputTarget[]>([])
  useEffect(() => {
    let frame: number | null = null
    let nextKey = 0
    const fields = new Map<VoiceInputElement, { key: string; padding: string; priority: string; original: number }>()
    const resize = new ResizeObserver(() => schedule())
    function restore(element: VoiceInputElement) {
      const field = fields.get(element)
      if (!field) return
      element.style.setProperty('padding-right', field.padding, field.priority)
      resize.unobserve(element)
      fields.delete(element)
    }
    function update() {
      frame = null
      for (const element of fields.keys()) if (!element.isConnected || !canUseVoiceInput(element)) restore(element)
      const topDialog = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1)
      const next: VoiceInputTarget[] = []
      document.querySelectorAll('input, textarea').forEach(element => {
        if (!canUseVoiceInput(element)) return
        const bounds = element.getBoundingClientRect()
        if (!bounds.width || !bounds.height || getComputedStyle(element).visibility === 'hidden') return
        let field = fields.get(element)
        if (!field) {
          field = { key: `voice-input-${++nextKey}`, padding: element.style.getPropertyValue('padding-right'), priority: element.style.getPropertyPriority('padding-right'), original: parseFloat(getComputedStyle(element).paddingRight) || 0 }
          fields.set(element, field)
          element.style.setProperty('padding-right', `${field.original + 36}px`, 'important')
          resize.observe(element)
        }
        const dialog = element.closest('dialog')
        if ((topDialog && dialog !== topDialog) || bounds.bottom <= 0 || bounds.top >= innerHeight || bounds.right <= 0 || bounds.left >= innerWidth) return
        const hasControl = Boolean(element.closest('.create-forms-date-control, .astro-toolbar-select-control, .list-filter-number')) || element.type === 'number'
        const zoom = dialog ? 1 / (Number(getComputedStyle(dialog).zoom) || 1) : 1
        const scale = bounds.width / Math.max(1, element.offsetWidth)
        const size = Math.max(24, 32 * scale)
        next.push({ key: field.key, element, host: dialog ?? document.body, label: voiceInputLabel(element), left: bounds.right - (hasControl ? field.original : 4) * scale - size, top: bounds.top + Math.min(bounds.height / 2, 28 * scale) - size / 2, zoom, size })
      })
      setTargets(current => current.length === next.length && current.every((target, index) => {
        const other = next[index]
        return target.key === other.key && target.host === other.host && target.label === other.label && target.left === other.left && target.top === other.top && target.zoom === other.zoom && target.size === other.size
      }) ? current : next)
    }
    function schedule() { if (frame === null) frame = requestAnimationFrame(update) }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'readonly', 'hidden', 'inert', 'open', 'type', 'aria-label', 'aria-labelledby'] })
    update()
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    document.addEventListener('toggle', schedule, true)
    document.addEventListener('animationend', schedule, true)
    document.addEventListener('transitionend', schedule, true)
    return () => {
      observer.disconnect()
      resize.disconnect()
      if (frame !== null) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('toggle', schedule, true)
      document.removeEventListener('animationend', schedule, true)
      document.removeEventListener('transitionend', schedule, true)
      for (const element of fields.keys()) restore(element)
    }
  }, [])
  return targets
}
