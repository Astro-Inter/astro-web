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
  searchable?: boolean
  maxVisibleRows?: number
  preferredPlacement?: 'auto' | 'below'
  value: string
}

function ToolbarSelect({ id, label, options, className = '', disabled = false, onValueChange, searchable = true, maxVisibleRows = 4, preferredPlacement = 'auto', value }: ToolbarSelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const listId = `${selectId}-options`
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingSelection, setPendingSelection] = useState<{ label: string; value: string } | null>(null)
  const [placement, setPlacement] = useState<'above' | 'below'>('below')
  const [menuMaxHeight, setMenuMaxHeight] = useState<number>()
  const { closing, requestClose } = useAnimatedClose()
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const selectedOption = options[selectedIndex]
  const selectedLabel = selectedOption?.triggerLabel ?? selectedOption?.label ?? label
  const pendingOption = pendingSelection && pendingSelection.value !== value
    ? options.find((option) => option.value === pendingSelection.value)
    : undefined
  const valueWhileClosing = pendingOption?.triggerLabel ?? pendingOption?.label ?? selectedLabel
  const displayedOption = pendingOption ?? selectedOption
  const normalizedSearchTerm = normalizeSearchText(searchTerm.trim())
  const filteredOptions = options.filter((option) => {
    if (!normalizedSearchTerm) return true
    return normalizeSearchText(`${option.label} ${option.value} ${option.triggerLabel ?? ''}`).includes(normalizedSearchTerm)
  })

  const closeSelect = useCallback((onFinished?: () => void, restoreFocus = false) => {
    requestClose(() => {
      setOpen(false)
      setSearchTerm('')
      onFinished?.()
      if (restoreFocus) triggerRef.current?.focus()
    })
  }, [requestClose])

  useLayoutEffect(() => {
    if (!open || closing) return
    const bounds = triggerRef.current?.getBoundingClientRect()
    if (bounds) {
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      const menuScale = triggerRef.current?.closest('.astro-modal') ? 1 : Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--astro-popup-zoom')) || 1
      const visibleRows = Math.min(Math.max(filteredOptions.length, 1), maxVisibleRows)
      const estimatedHeight = (visibleRows * 3.4 + 3) * rootFontSize * menuScale
      const popoverGap = 0.45 * rootFontSize * menuScale
      const availableBelow = Math.max(0, window.innerHeight - bounds.bottom - popoverGap - 12)
      const availableAbove = Math.max(0, bounds.top - popoverGap - 12)
      const openAbove = preferredPlacement === 'auto' && availableBelow < estimatedHeight && availableAbove > availableBelow
      const availableSpace = openAbove ? availableAbove : availableBelow
      setPlacement(openAbove ? 'above' : 'below')
      setMenuMaxHeight(Math.min(estimatedHeight, availableSpace))
    }
    if (document.activeElement !== triggerRef.current) triggerRef.current?.focus()
  }, [closing, filteredOptions.length, maxVisibleRows, open, preferredPlacement])

  useEffect(() => {
    if (!open) return

    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) closeSelect()
    }

    function closeOnScroll(event: Event) {
      if (event.target instanceof Node && containerRef.current?.contains(event.target)) return
      closeSelect()
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [closeSelect, open])

  function choose(valueToSelect: string) {
    const option = options.find((item) => item.value === valueToSelect)
    setPendingSelection(option ? { value: valueToSelect, label: option.triggerLabel ?? option.label } : null)
    onValueChange(valueToSelect)
    closeSelect(undefined, true)
  }

  function handleOptionsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = optionRefs.current.findIndex((option) => option === document.activeElement)
    let nextIndex: number

    switch (event.key) {
      case 'ArrowDown':
        if (filteredOptions.length === 0) return
        nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % filteredOptions.length
        break
      case 'ArrowUp':
        if (filteredOptions.length === 0) return
        nextIndex = currentIndex < 0 ? filteredOptions.length - 1 : (currentIndex - 1 + filteredOptions.length) % filteredOptions.length
        break
      case 'Home':
        if (event.target === triggerRef.current && searchTerm) return
        nextIndex = 0
        break
      case 'End':
        if (event.target === triggerRef.current && searchTerm) return
        nextIndex = filteredOptions.length - 1
        break
      case 'Escape':
        event.preventDefault()
        closeSelect(undefined, true)
        return
      default: return
    }

    event.preventDefault()
    optionRefs.current[nextIndex]?.focus()
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === 'Backspace') {
        event.preventDefault()
        setSearchTerm('')
        setPendingSelection(null)
        setOpen(true)
      } else if (event.key.length === 1 && event.key.trim() && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        setSearchTerm(event.key)
        setPendingSelection(null)
        setOpen(true)
      }
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const exactMatch = filteredOptions.find((option) => {
        const query = normalizeSearchText(searchTerm.trim())
        return query && [option.label, option.value, option.triggerLabel ?? ''].some((text) => normalizeSearchText(text) === query)
      })
      const option = exactMatch ?? (filteredOptions.length === 1 ? filteredOptions[0] : undefined)
      if (option) choose(option.value)
      else closeSelect(undefined, true)
    }
  }

  function handleReadOnlyKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Enter' && event.key !== ' ') return
    if (open) return
    event.preventDefault()
    setSearchTerm('')
    setPendingSelection(null)
    setOpen(true)
  }

  return (
    <div
      className={`astro-toolbar-select${className ? ` ${className}` : ''}`}
      data-placement={placement}
      data-open={open && !closing}
      onKeyDown={handleOptionsKeyDown}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget)) closeSelect()
      }}
      ref={containerRef}
    >
      <div className="astro-toolbar-select-control">
        <input
          aria-controls={listId}
          aria-expanded={open && !closing}
          aria-haspopup="listbox"
          aria-label={label}
          aria-autocomplete={searchable ? 'list' : 'none'}
          autoComplete="off"
          className={`astro-toolbar-select-trigger astro-toolbar-select-input${displayedOption?.tone === 'muted' && (!open || !searchable || closing) ? ' astro-toolbar-select-input--muted' : ''}`}
          disabled={disabled}
          id={selectId}
          onChange={(event) => { setSearchTerm(event.target.value); if (!open) setOpen(true) }}
          onClick={() => { if (!open) { setSearchTerm(''); setPendingSelection(null); setOpen(true) } }}
          onKeyDown={searchable ? handleInputKeyDown : handleReadOnlyKeyDown}
          placeholder={searchable ? 'Digite para buscar...' : undefined}
          readOnly={!searchable || closing}
          ref={triggerRef}
          role="combobox"
          type="text"
          value={searchable && open && !closing ? searchTerm : closing ? valueWhileClosing : selectedLabel}
        />
        <button
          aria-controls={listId}
          aria-expanded={open && !closing}
          aria-label={open && !closing ? `Fechar opções de ${label}` : `Abrir opções de ${label}`}
          className="astro-toolbar-select-toggle"
          disabled={disabled}
          onClick={() => { if (open) closeSelect(undefined, true); else { setSearchTerm(''); setPendingSelection(null); setOpen(true); triggerRef.current?.focus() } }}
          type="button"
        ><AstroIcon name="chevron-down" /></button>
      </div>
      {open && (
        <div aria-label={label} className={`astro-toolbar-select-popover${closing ? ' astro-toolbar-select-popover--closing' : ''}`} id={listId} role="listbox" style={{ maxHeight: menuMaxHeight }}>
          <div className={`astro-toolbar-select-options${filteredOptions.length <= 1 ? ' astro-toolbar-select-options--compact' : ''}`}>
            {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
              <button
                aria-selected={option.value === value}
                className={`astro-toolbar-select-option${option.tone === 'muted' ? ' astro-toolbar-select-option--muted' : ''}`}
                key={option.value}
                onClick={() => choose(option.value)}
                onMouseDown={event => event.preventDefault()}
                ref={(element) => { optionRefs.current[index] = element }}
                role="option"
                tabIndex={-1}
                type="button"
              >{option.label}</button>
            )) : <div aria-disabled="true" className="astro-toolbar-select-empty" role="option">Nenhuma opção encontrada</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function normalizeSearchText(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

export default ToolbarSelect
