import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'

export interface OptionsPopupItem {
  trackingAction?: string
  disabled?: boolean
  id: string
  label: string
  onSelect: () => void
  separatorAfter?: boolean
  tone?: 'default' | 'danger' | 'muted'
}

interface OptionsPopupProps {
  trackingName?: string
  ariaLabel: string
  closing?: boolean
  id?: string
  items: readonly OptionsPopupItem[]
  onClose: () => void
  panelRef: RefObject<HTMLDivElement | null>
  style: CSSProperties
}

function OptionsPopup({ trackingName, ariaLabel, closing = false, id, items, onClose, panelRef, style }: OptionsPopupProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (style.visibility !== 'hidden') itemRefs.current[0]?.focus({ preventScroll: true })
  }, [style.visibility])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (items.length === 0 || closing) return
    const currentIndex = itemRefs.current.findIndex((item) => item === document.activeElement)
    let nextIndex: number

    switch (event.key) {
      case 'ArrowDown': nextIndex = (currentIndex + 1) % items.length; break
      case 'ArrowUp': nextIndex = (currentIndex - 1 + items.length) % items.length; break
      case 'Home': nextIndex = 0; break
      case 'End': nextIndex = items.length - 1; break
      case 'Escape':
      case 'Tab':
        event.preventDefault()
        onClose()
        return
      default: return
    }

    event.preventDefault()
    itemRefs.current[nextIndex]?.focus({ preventScroll: true })
  }

  return (
    <div data-track-dialog={trackingName} aria-label={ariaLabel} className={`astro-options-popup${closing ? ' astro-options-popup--closing' : ''}`} id={id} onKeyDown={handleKeyDown} ref={panelRef} role="menu" style={style}>
      {items.map((item, index) => (
        <button data-track-action={item.trackingAction}
          aria-disabled={item.disabled || undefined}
          className={`astro-options-popup-item${item.separatorAfter ? ' astro-options-popup-item--separated' : ''}${item.tone === 'danger' ? ' astro-options-popup-item--danger' : ''}${item.tone === 'muted' ? ' astro-options-popup-item--muted' : ''}${item.disabled ? ' astro-options-popup-item--disabled' : ''}`}
          key={item.id}
          onClick={() => { if (!item.disabled) item.onSelect() }}
          ref={(element) => { itemRefs.current[index] = element }}
          role="menuitem"
          type="button"
        >{item.label}</button>
      ))}
    </div>
  )
}

export default OptionsPopup
