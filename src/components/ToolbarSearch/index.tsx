import { useId, useRef, type InputHTMLAttributes } from 'react'
import AstroIcon from '../AstroIcon'

interface ToolbarSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  onClear?: () => void
}

function ToolbarSearch({ id, label, className = '', onClear, value, ...inputProps }: ToolbarSearchProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const inputRef = useRef<HTMLInputElement>(null)
  const canClear = onClear && String(value ?? '').length > 0

  return (
    <div className={`astro-toolbar-search${className ? ` ${className}` : ''}`}>
      <label className="sr-only" htmlFor={inputId}>{label}</label>
      <AstroIcon name="search" />
      <input id={inputId} ref={inputRef} type="search" value={value} {...inputProps} />
      {canClear && (
        <button aria-label="Limpar busca" className="astro-toolbar-search-clear" onClick={() => { onClear(); inputRef.current?.focus() }} type="button">
          <img alt="" aria-hidden="true" height="21" src="/icon/across.png" width="21" />
        </button>
      )}
    </div>
  )
}

export default ToolbarSearch
