import { useState, type FormEvent } from 'react'
import type { Manager, ManagerDetailsValues } from '../../types'
import { formatCpfCnpj, sanitizeEmail } from '../../utils'
import { getInitials, validateManagerDetails, type ManagerDetailsValidationErrors } from '../../utils/manager'
import AppModal from '../appModal'
import FormField from '../formField'
import PasswordField from '../passwordField'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

const modalityOptions = ['Presencial', 'Híbrido', 'Remoto'].map((label) => ({ label, value: label }))
const statusOptions = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

interface ManagerDetailsModalProps {
  dimmed?: boolean
  manager: Manager
  mode: 'view' | 'edit'
  onClose: () => void
  onSubmit: (values: ManagerDetailsValues) => string | null
  open?: boolean
  positions: readonly string[]
  subject?: 'gestor' | 'colaborador'
  units: readonly string[]
}

function ManagerDetailsModal({ dimmed = false, manager, mode, onClose, onSubmit, open = true, positions, subject = 'gestor', units }: ManagerDetailsModalProps) {
  const editable = mode === 'edit'
  const [values, setValues] = useState<ManagerDetailsValues>({ name: manager.name, email: manager.email, cpf: manager.cpf, unit: manager.unit, position: manager.position, modality: manager.modality, active: manager.active })
  const [errors, setErrors] = useState<ManagerDetailsValidationErrors>({})
  const [formError, setFormError] = useState('')
  const [password, setPassword] = useState({ value: 'astro-demo', visible: false })
  const unitOptions = [...new Set([manager.unit, ...units])].map((label) => ({ label, value: label }))
  const positionOptions = [...new Set([manager.position, ...positions])].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((label) => ({ label, value: label }))

  function update<Field extends keyof ManagerDetailsValues>(field: Field, value: ManagerDetailsValues[Field]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editable) return
    const preparedValues = { ...values, name: values.name.trim(), position: values.position.trim() }
    const nextErrors = validateManagerDetails(preparedValues, password.value)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const submitError = onSubmit(preparedValues)
    if (submitError) setFormError(submitError)
  }

  function errorFor(field: keyof ManagerDetailsValidationErrors) {
    return errors[field] && <span id={`manager-detail-${field}-error`} role="alert">{errors[field]}</span>
  }

  return (
    <AppModal className="account-details-modal manager-details-modal" dimmed={dimmed} onClose={onClose} open={open} title={editable ? `Editar ${subject}` : `Informações do ${subject}`}>
      {(dismiss) => <form className="account-details-form" noValidate onSubmit={handleSubmit}>
        <div className="account-profile-header">
          <div className="account-profile-photo"><span aria-hidden="true" className="manager-avatar manager-avatar--large">{getInitials(manager.name)}</span></div>
          <div className="account-profile-identity"><h3>{manager.name}</h3><p>{manager.email}</p></div>
        </div>

        <div className="account-details-grid">
          <div className="field-group">
            <FormField aria-describedby={errors.name ? 'manager-detail-name-error' : undefined} aria-invalid={Boolean(errors.name)} id="manager-detail-name" label="Nome" maxLength={80} onChange={(event) => update('name', event.target.value)} readOnly={!editable} value={values.name} />
            {errorFor('name')}
          </div>
          <div className="field-group">
            <FormField aria-describedby={errors.cpf ? 'manager-detail-cpf-error' : undefined} aria-invalid={Boolean(errors.cpf)} id="manager-detail-cpf" inputMode="numeric" label="CPF" onChange={(event) => update('cpf', formatCpfCnpj(event.target.value).slice(0, 14))} placeholder="Não informado" readOnly={!editable} value={values.cpf} />
            {errorFor('cpf')}
          </div>
          <div className="field-group">
            <FormField aria-describedby={errors.email ? 'manager-detail-email-error' : undefined} aria-invalid={Boolean(errors.email)} id="manager-detail-email" label="E-mail" onChange={(event) => update('email', sanitizeEmail(event.target.value))} readOnly={!editable} type="email" value={values.email} />
            {errorFor('email')}
          </div>
          <div className="field-group">
            <PasswordField id="manager-detail-password" label="Senha" onChange={(value) => {
              setPassword((current) => ({ ...current, value }))
              setErrors((current) => ({ ...current, password: undefined }))
              setFormError('')
            }} onToggleVisibility={() => setPassword((current) => ({ ...current, visible: !current.visible }))} placeholder="Insira a senha" readOnly={!editable} value={password.value} visible={password.visible} />
            {errorFor('password')}
          </div>
          {editable
            ? <div className="field-group"><label htmlFor="manager-detail-unit">Unidades</label><ToolbarSelect className="account-field-select" id="manager-detail-unit" label="Unidades" onValueChange={(unit) => update('unit', unit)} options={unitOptions} searchable={false} value={values.unit} />{errorFor('unit')}</div>
            : <FormField id="manager-detail-unit" label="Unidades" readOnly value={values.unit} />}
          {editable
            ? <div className="field-group"><label htmlFor="manager-detail-position">Cargo</label><ToolbarSelect className="account-field-select" id="manager-detail-position" label="Cargo" onValueChange={(position) => update('position', position)} options={positionOptions} value={values.position} />{errorFor('position')}</div>
            : <FormField id="manager-detail-position" label="Cargo" readOnly value={values.position} />}
          {editable
            ? <div className="field-group"><label htmlFor="manager-detail-modality">Modalidade</label><ToolbarSelect className="account-field-select" id="manager-detail-modality" label="Modalidade" onValueChange={(modality) => update('modality', modality)} options={modalityOptions} searchable={false} value={values.modality} />{errorFor('modality')}</div>
            : <FormField id="manager-detail-modality" label="Modalidade" readOnly value={values.modality} />}
          {editable
            ? <div className="field-group"><label htmlFor="manager-detail-status">Status</label><ToolbarSelect className="account-field-select" id="manager-detail-status" label="Status" onValueChange={(status) => update('active', status === 'active')} options={statusOptions} searchable={false} value={values.active ? 'active' : 'inactive'} /></div>
            : <FormField id="manager-detail-status" label="Status" readOnly value={values.active ? 'Ativo' : 'Inativo'} />}
        </div>
        {formError && <p className="manager-details-form-error" role="alert">{formError}</p>}

        <div className="astro-modal-actions">
          <button className="astro-modal-cancel" onClick={dismiss} type="button">{editable ? 'Cancelar' : 'Voltar'}</button>
          {editable && <PurpleButton type="submit">Salvar alterações</PurpleButton>}
        </div>
      </form>}
    </AppModal>
  )
}

export default ManagerDetailsModal
