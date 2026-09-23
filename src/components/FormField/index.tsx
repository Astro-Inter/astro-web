import type { InputHTMLAttributes } from 'react'

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  containerClassName?: string
}

function FormField({ id, label, containerClassName = 'field-group', ...inputProps }: FormFieldProps) {
  return (
    <div className={containerClassName}>
      <label htmlFor={id}>{label}</label>
      <input id={id} {...inputProps} />
    </div>
  )
}

export default FormField