import AstroIcon from '../AstroIcon'

interface PasswordFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  visible: boolean
  onChange: (value: string) => void
  onToggleVisibility: () => void
}

function PasswordField({ id, label, placeholder, value, visible, onChange, onToggleVisibility }: PasswordFieldProps) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          autoComplete="off"
          id={id}
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
          <AstroIcon name={visible ? 'eye' : 'eye-off'} />
        </button>
      </div>
    </div>
  )
}

export default PasswordField
