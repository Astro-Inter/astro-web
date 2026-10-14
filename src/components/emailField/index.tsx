import { BUTTONS } from '../../gtm/buttons'
import { useRef } from 'react'
import { blockEmailWhitespaceInput, blockEmailWhitespaceKey, sanitizeEmail } from '../../utils/inputFormatting'
import { iconAsset } from '../../utils/iconAsset'
import FormField from '../formField'

interface EmailFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  error?: string
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
  required?: boolean
  containerClassName?: string
  wrapperClassName?: string
  clearable?: boolean
}

function EmailField({ id, label, placeholder, value, onChange, error, invalid = false, describedBy, disabled = false, required = false, containerClassName, wrapperClassName = '', clearable = false }: EmailFieldProps) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const fieldInvalid = invalid || Boolean(error)
  return <div className={`${clearable ? 'login-email-field ' : ''}${wrapperClassName}`} ref={fieldRef}>
    <FormField aria-describedby={describedBy} aria-invalid={fieldInvalid} autoComplete="email" containerClassName={containerClassName}
      disabled={disabled} error={error} id={id} label={label} maxLength={254} name="email"
      onBeforeInput={blockEmailWhitespaceInput} onChange={event => onChange(sanitizeEmail(event.target.value))}
      onKeyDown={blockEmailWhitespaceKey} placeholder={placeholder} required={required} type="email" value={value} />
    {clearable && (value || fieldInvalid) && <button data-track-action={BUTTONS.comuns.limpar_email} aria-label="Limpar email" className={`login-email-clear${fieldInvalid ? ' login-email-clear--invalid' : ''}`}
      disabled={disabled} onClick={() => { onChange(''); fieldRef.current?.querySelector('input')?.focus() }} type="button">
      <span aria-hidden="true" className="login-email-error-icon" style={{ maskImage: `url("${iconAsset('close.svg')}")` }} />
    </button>}
  </div>
}

export default EmailField
