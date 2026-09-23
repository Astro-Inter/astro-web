import AstroIcon from '../AstroIcon'

interface PasswordFieldProps {
  autoComplete?: string
  id: string
  label: string
  placeholder: string
  value: string
  visible: boolean
  onChange: (value: string) => void
  onToggleVisibility: () => void
}

function PasswordField({ autoComplete = 'off', id, label, placeholder, value, visible, onChange, onToggleVisibility }: PasswordFieldProps) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          autoComplete={autoComplete}
          id={id}
          maxLength={128}
          name={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={visible ? 'text' : 'password'}
          value={value}
        />
        <button
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="password-visibility"
          onClick={onToggleVisibility}
          type="button"
        >
          <span className={`password-icon-stack${visible ? ' is-visible' : ''}`} aria-hidden="true">
            <AstroIcon className="password-icon password-icon--closed" name="eye-off" />
            <AstroIcon className="password-icon password-icon--open" name="eye" />
          </span>
        </button>
      </div>
    </div>
  )
}

export default PasswordField
