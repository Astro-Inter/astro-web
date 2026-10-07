import { useState, type FormEvent } from 'react'
import type { EmployeeInviteValues } from '../../types'
import { formatCpfCnpj, sanitizeEmail } from '../../utils'
import { validateEmployeeInvite, type EmployeeInviteValidationErrors } from '../../utils/employee'
import AppModal from '../appModal'
import FormField from '../formField'
import PasswordField from '../passwordField'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

const modalityOptions = [
  { value: '', label: 'Selecione a modalidade', tone: 'muted' as const },
  ...['Presencial', 'Híbrido', 'Remoto'].map((label) => ({ label, value: label })),
]
const statusOptions = [
  { value: '', label: 'Selecione o status', tone: 'muted' as const },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

interface InviteEmployeeModalProps {
  onClose: () => void
  onInvite: (values: EmployeeInviteValues) => string | null
}

function InviteEmployeeModal({ onClose, onInvite }: InviteEmployeeModalProps) {
  const [values, setValues] = useState<EmployeeInviteValues>({ name: '', cpf: '', email: '', password: '', unit: '', position: '', modality: '', status: '' })
  const [errors, setErrors] = useState<EmployeeInviteValidationErrors>({})
  const [formError, setFormError] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)

  function update<Field extends keyof EmployeeInviteValues>(field: Field, value: EmployeeInviteValues[Field]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>, dismiss: () => void) {
    event.preventDefault()
    const preparedValues = { ...values, name: values.name.trim(), unit: values.unit.trim(), position: values.position.trim() }
    const nextErrors = validateEmployeeInvite(preparedValues)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const inviteError = onInvite(preparedValues)
    if (inviteError) {
      setFormError(inviteError)
      return
    }

    dismiss()
  }

  function errorFor(field: keyof EmployeeInviteValidationErrors) {
    return errors[field] && <span id={`invite-employee-${field}-error`} role="alert">{errors[field]}</span>
  }

  function textField(field: 'name' | 'cpf' | 'email' | 'unit' | 'position', label: string, placeholder: string, onChange: (value: string) => string = (value) => value) {
    return (
      <div className="field-group">
        <FormField
          aria-describedby={errors[field] ? `invite-employee-${field}-error` : undefined}
          aria-invalid={Boolean(errors[field])}
          id={`invite-employee-${field}`}
          inputMode={field === 'cpf' ? 'numeric' : undefined}
          label={label}
          maxLength={field === 'email' ? 254 : 80}
          onChange={(event) => update(field, onChange(event.target.value))}
          placeholder={placeholder}
          type={field === 'email' ? 'email' : 'text'}
          value={values[field]}
        />
        {errorFor(field)}
      </div>
    )
  }

  return (
    <AppModal className="account-details-modal manager-details-modal" onClose={onClose} title="Adicionar colaborador">
      {(dismiss) => <form autoComplete="off" className="account-details-form" noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
        <div className="account-details-grid">
          {textField('name', 'Nome', 'Digite o nome')}
          {textField('cpf', 'CPF', '000.000.000-00', (value) => formatCpfCnpj(value).slice(0, 14))}
          {textField('email', 'E-mail', 'exemplo@astro.com.br', sanitizeEmail)}
          <div className="field-group">
            <PasswordField id="invite-employee-password" label="Senha" onChange={(password) => update('password', password)} onToggleVisibility={() => setPasswordVisible((current) => !current)} placeholder="Digite a senha" value={values.password} visible={passwordVisible} />
            {errorFor('password')}
          </div>
          {textField('unit', 'Unidades', 'Digite a unidade')}
          {textField('position', 'Cargo', 'Digite o cargo')}
          <div className="field-group">
            <label htmlFor="invite-employee-modality">Modalidade</label>
            <ToolbarSelect className="account-field-select" id="invite-employee-modality" label="Modalidade" onValueChange={(modality) => update('modality', modality)} options={modalityOptions} searchable={false} value={values.modality} />
            {errorFor('modality')}
          </div>
          <div className="field-group">
            <label htmlFor="invite-employee-status">Status</label>
            <ToolbarSelect className="account-field-select" id="invite-employee-status" label="Status" onValueChange={(status) => update('status', status === 'active' || status === 'inactive' ? status : '')} options={statusOptions} searchable={false} value={values.status} />
            {errorFor('status')}
          </div>
        </div>
        {formError && <p className="manager-details-form-error" role="alert">{formError}</p>}

        <div className="astro-modal-actions">
          <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
          <PurpleButton type="submit">Adicionar</PurpleButton>
        </div>
      </form>}
    </AppModal>
  )
}

export default InviteEmployeeModal
