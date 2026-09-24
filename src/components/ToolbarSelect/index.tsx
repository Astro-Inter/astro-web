import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import AstroIcon from '../AstroIcon'

interface ToolbarSelectOption {
  label: string
  triggerLabel?: string
  tone?: 'default' | 'muted'
  value: string
}

interface ToolbarSelectProps {
  className?: string
  disabled?: boolean
  id?: string
  label: string
  onValueChange: (value: string) => void
  options: readonly ToolbarSelectOption[]
  value: string
}

function ToolbarSelect({ id, label, options, className = '', disabled = false, onValueChange, value }: ToolbarSelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const listId = `${selectId}-options`
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'above' | 'below'>('below')
  const { closing, requestClose } = useAnimatedClose(160)
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const selectedLabel = options[selectedIndex]?.triggerLabel ?? options[selectedIndex]?.label ?? label

  const closeSelect = useCallback((onFinished?: () => void, restoreFocus = false) => {
    requestClose(() => {
      setOpen(false)
      onFinished?.()
      if (restoreFocus) triggerRef.current?.focus()
    })
  }, [requestClose])

  useLayoutEffect(() => {
    if (!open || closing) return
    const bounds = triggerRef.current?.getBoundingClientRect()
    const estimatedHeight = options.length * 42 + 12
    if (bounds) {
      setPlacement(window.innerHeight - bounds.bottom < estimatedHeight + 12 && bounds.top > window.innerHeight - bounds.bottom ? 'above' : 'below')
    }
    optionRefs.current[selectedIndex]?.focus()
  }, [closing, open, options.length, selectedIndex])

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) closeSelect()
    }

    function closeOnScroll() { closeSelect() }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [closeSelect, open])

  function choose(valueToSelect: string) {
    closeSelect(() => onValueChange(valueToSelect), true)
  }

  function handleOptionsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement)
    let nextIndex: number

    switch (event.key) {
      case 'ArrowDown': nextIndex = (currentIndex + 1) % options.length; break
      case 'ArrowUp': nextIndex = (currentIndex - 1 + options.length) % options.length; break
      case 'Home': nextIndex = 0; break
      case 'End': nextIndex = options.length - 1; break
      case 'Escape':
        event.preventDefault()
        closeSelect(undefined, true)
        return
      default: return
    }

    event.preventDefault()
    optionRefs.current[nextIndex]?.focus()
  }

  return (
    <div
      className={`astro-toolbar-select${className ? ` ${className}` : ''}`}
      data-placement={placement}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget)) closeSelect()
      }}
      ref={containerRef}
    >
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`${label}: ${selectedLabel}`}
        className="astro-toolbar-select-trigger"
        disabled={disabled}
        id={selectId}
        onClick={() => { if (open) closeSelect(undefined, true); else setOpen(true) }}
        onKeyDown={(event) => {
          if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault()
            setOpen(true)
          }
        }}
        ref={triggerRef}
        type="button"
      >
        <span>{selectedLabel}</span>
        <AstroIcon name="chevron-down" />
      </button>
      {open && (
        <div aria-label={label} className={`astro-toolbar-select-popover${closing ? ' astro-toolbar-select-popover--closing' : ''}`} id={listId} onKeyDown={handleOptionsKeyDown} role="listbox">
          {options.map((option, index) => (
            <button
              aria-selected={option.value === value}
              className={`astro-toolbar-select-option${option.tone === 'muted' ? ' astro-toolbar-select-option--muted' : ''}`}
              key={option.value}
              onClick={() => choose(option.value)}
              ref={(element) => { optionRefs.current[index] = element }}
              role="option"
              tabIndex={-1}
              type="button"
            >{option.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default ToolbarSelect
