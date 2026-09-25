import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'

export interface OptionsPopupItem {
  id: string
  label: string
  onSelect: () => void
  separatorAfter?: boolean
  tone?: 'default' | 'danger' | 'muted'
}

interface OptionsPopupProps {
  ariaLabel: string
  closing?: boolean
  id?: string
  items: readonly OptionsPopupItem[]
  onClose: () => void
  panelRef: RefObject<HTMLDivElement | null>
  style: CSSProperties
}

function OptionsPopup({ ariaLabel, closing = false, id, items, onClose, panelRef, style }: OptionsPopupProps) {
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
        event.preventDefault()
        onClose()
        return
      default: return
    }

    event.preventDefault()
    itemRefs.current[nextIndex]?.focus({ preventScroll: true })
  }

  return (
    <div aria-label={ariaLabel} className={`astro-options-popup${closing ? ' astro-options-popup--closing' : ''}`} id={id} onKeyDown={handleKeyDown} ref={panelRef} role="menu" style={style}>
      {items.map((item, index) => (
        <button
          className={`astro-options-popup-item${item.separatorAfter ? ' astro-options-popup-item--separated' : ''}${item.tone === 'danger' ? ' astro-options-popup-item--danger' : ''}${item.tone === 'muted' ? ' astro-options-popup-item--muted' : ''}`}
          key={item.id}
          onClick={item.onSelect}
          ref={(element) => { itemRefs.current[index] = element }}
          role="menuitem"
          type="button"
        >{item.label}</button>
      ))}
    </div>
  )
}

export default OptionsPopup
