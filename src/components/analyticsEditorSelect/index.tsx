import { useId } from 'react'
import ToolbarSelect from '../toolbarSelect'
import AnimatedFieldError from '../animatedFieldError'

interface AnalyticsEditorSelectProps {
  label: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  error?: string
}

export default function AnalyticsEditorSelect({ label, value, options, onChange, error }: AnalyticsEditorSelectProps) {
  const id = useId()
  return <div className="create-forms-field analytics-editor-field">
    <label htmlFor={id} id={`${id}-label`}>{label}</label>
    <ToolbarSelect id={id} labelledBy={`${id}-label`} label={label} error={error} className="create-forms-select" escapeOverflow closeOnPageScroll={false} options={options} value={value} onValueChange={onChange} />
    <AnimatedFieldError id={`${id}-error`} message={error || ''} />
  </div>
}
