import type { InputHTMLAttributes } from 'react'

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  containerClassName?: string
  error?: string
}

function FormField({ id, label, containerClassName = 'field-group', error, ...inputProps }: FormFieldProps) {
  return (
    <div className={containerClassName}>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...inputProps} placeholder={inputProps.placeholder ?? (inputProps.readOnly ? 'Não informado' : undefined)} aria-invalid={Boolean(error) || inputProps['aria-invalid']}
        aria-describedby={[inputProps['aria-describedby'], error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined} />
      {error && <p className="login-field-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  )
}

export default FormField
