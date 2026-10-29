import { useId } from 'react'
import ToolbarSelect from '../toolbarSelect'

interface AnalyticsEditorSelectProps {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}

export default function AnalyticsEditorSelect({ label, value, options, onChange }: AnalyticsEditorSelectProps) {
  const id = useId()
  return <div className="create-forms-field analytics-editor-field">
    <label htmlFor={id}>{label}</label>
    <ToolbarSelect id={id} label={label} className="create-forms-select" escapeOverflow closeOnPageScroll={false} options={options} value={value} onValueChange={onChange} />
  </div>
}
