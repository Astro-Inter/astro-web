import { useId, type SelectHTMLAttributes } from 'react'
import AstroIcon from '../AstroIcon'

interface ToolbarSelectOption {
  label: string
  value: string
}

interface ToolbarSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string
  options: readonly ToolbarSelectOption[]
}

function ToolbarSelect({ id, label, options, className = '', ...selectProps }: ToolbarSelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <label className={`astro-toolbar-select${className ? ` ${className}` : ''}`} htmlFor={selectId}>
      <span className="sr-only">{label}</span>
      <select id={selectId} {...selectProps}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <AstroIcon name="chevron-down" />
    </label>
  )
}

export default ToolbarSelect
