import AstroIcon from '../astroIcon'
import { iconAsset } from '../../utils/iconAsset'

interface PasswordFieldProps {
  autoComplete?: string
  id: string
  label: string
  placeholder: string
  value: string
  visible: boolean
  onChange: (value: string) => void
  onToggleVisibility: () => void
  readOnly?: boolean
  disabled?: boolean
  required?: boolean
  error?: string
  invalid?: boolean
  describedBy?: string
}

function PasswordField({ autoComplete = 'off', id, label, placeholder, value, visible, onChange, onToggleVisibility, readOnly = false, disabled = false, required = false, error, invalid = false, describedBy }: PasswordFieldProps) {
  const fieldInvalid = invalid || Boolean(error)
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          autoComplete={autoComplete}
          aria-describedby={error ? `${id}-error` : describedBy}
          aria-invalid={fieldInvalid}
          disabled={disabled}
          id={id}
          maxLength={128}
          name={id}
          onChange={(event) => onChange(event.target.value)}
          readOnly={readOnly}
          required={required}
          placeholder={placeholder}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="password-visibility"
          disabled={disabled}
          onClick={onToggleVisibility}
          type="button"
        >
          <span
            className={`password-icon-stack${visible ? ' is-visible' : ''}${fieldInvalid ? ' password-icon-stack--invalid' : ''}`}
            aria-hidden="true"
            style={fieldInvalid ? { maskImage: `url("${iconAsset(visible ? 'eye.svg' : 'eyeOff.svg')}")` } : undefined}
          >
            <AstroIcon className="password-icon password-icon--closed" name="eye-off" />
            <AstroIcon className="password-icon password-icon--open" name="eye" />
          </span>
        </button>
      </div>
      {error && <p className="login-field-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  )
}

export default PasswordField
