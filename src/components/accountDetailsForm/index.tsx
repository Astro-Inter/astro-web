import { useRef, useState, type FormEvent } from 'react'
import type { AccountDetails, AccountFormValues } from '../../types/account'
import type { Position } from '../../types/position'
import type { Unit } from '../../types/unit'
import { validateAccountDetails, type AccountValidationErrors } from '../../utils/account'
import { formatCpfCnpj } from '../../utils/inputFormatting'
import { collaboratorModalityLabels } from '../../utils/collaborator'
import { BUTTONS } from '../../gtm/buttons'
import FormField from '../formField'
import ToolbarSelect from '../toolbarSelect'
import PurpleButton from '../purpleButton'

interface AccountDetailsFormProps {
  profile: AccountDetails
  roles: Position[]
  units: Unit[]
  editable: boolean
  canChangeLinks: boolean
  pending: boolean
  onSave: (values: AccountFormValues) => Promise<void>
  onCancel: () => void
}

function AccountDetailsForm({ profile, roles, units, editable, canChangeLinks, pending, onSave, onCancel }: AccountDetailsFormProps) {
  const [values, setValues] = useState<AccountFormValues>(() => ({ name: profile.name, cpf: profile.cpf, email: profile.email,
    roleId: profile.roleId, unitId: profile.unitId, workModel: profile.workModel }))
  const [errors, setErrors] = useState<AccountValidationErrors>({})
  const busy = useRef(false)
  const options = (rows: (Unit | Position)[], id: string, name: string) => {
    const choices = rows.filter(row => row.active || row.id === id).map(row => ({ value: row.id, label: row.name }))
    if (id && !choices.some(row => row.value === id)) choices.push({ value: id, label: name })
    return choices
  }
  const roleOptions = options(roles, profile.roleId, profile.position)
  const unitOptions = options(units, profile.unitId, profile.units)
  function update(field: keyof AccountFormValues, value: string) {
    setValues(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy.current || pending || !editable) return
    const nextErrors = validateAccountDetails(values)
    if (!roleOptions.some(row => row.value === values.roleId)) nextErrors.roleId = 'Selecione um cargo disponível.'
    if (!unitOptions.some(row => row.value === values.unitId)) nextErrors.unitId = 'Selecione uma unidade disponível.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    busy.current = true
    try { await onSave(values) } finally { busy.current = false }
  }
  function select(field: 'roleId' | 'unitId' | 'workModel', label: string, choices: { label: string; value: string }[], disabled = false) {
    const id = `account-detail-${field}`
    return <div className="field-group"><label htmlFor={id} id={id + '-label'}>{label}</label>
      <ToolbarSelect trackingAction={({ roleId: BUTTONS.comuns.cargo, unitId: BUTTONS.comuns.unidade, workModel: BUTTONS.comuns.modalidade })[field]} className="account-field-select" disabled={pending || disabled} error={errors[field]} id={id} label={label}
        onValueChange={value => update(field, value)} options={[{ label: `Selecione ${field === 'roleId' ? 'o' : 'a'} ${label.toLowerCase()}`, value: '', tone: 'muted' }, ...choices]} value={values[field]} labelledBy={id + '-label'} />
      {errors[field] && <p className="login-field-error" id={`${id}-error`} role="alert">{errors[field]}</p>}
    </div>
  }
  return <form aria-busy={pending} className="account-details-form" data-track-submit={editable ? BUTTONS.comuns.salvar_alteracoes : undefined} noValidate onSubmit={event => { void submit(event) }}>
    <fieldset className="position-dialog-fields" disabled={pending}><legend className="sr-only">Dados da conta</legend>
      <div className="account-details-grid">
        <FormField error={errors.name} id="account-detail-name" label="Nome" placeholder={editable ? "Digite o nome completo" : undefined} maxLength={255} onChange={event => update('name', event.target.value)} readOnly={!editable} value={values.name} />
        <FormField error={errors.cpf} id="account-detail-cpf" inputMode="numeric" label="CPF" placeholder={editable ? "000.000.000-00" : "Não informado"} maxLength={14} onChange={event => update('cpf', formatCpfCnpj(event.target.value.replace(/\D/g, '').slice(0, 11)))} readOnly={!editable} value={values.cpf} />
        <FormField error={errors.email} id="account-detail-email" label="E-mail" placeholder={editable ? "example@email.com" : "Não informado"} maxLength={255} onChange={event => update('email', event.target.value)} readOnly={!editable} type="email" value={values.email} />
        {editable ? select('unitId', 'Unidade', unitOptions, !canChangeLinks) : <FormField id="account-detail-units" label="Unidade" readOnly value={profile.units} />}
        {editable ? select('roleId', 'Cargo', roleOptions, !canChangeLinks) : <FormField id="account-detail-position" label="Cargo" readOnly value={profile.position} />}
        {editable ? select('workModel', 'Modalidade', Object.entries(collaboratorModalityLabels).map(([value, label]) => ({ value, label }))) : <FormField id="account-detail-modality" label="Modalidade" readOnly value={profile.modality} />}
      </div>
    </fieldset>
    {editable && !canChangeLinks && <p className="astro-modal-description">Seu cargo e sua unidade são definidos pelo gestor do workspace.</p>}
    <div className="astro-modal-actions">
      <button data-track-action={editable ? BUTTONS.comuns.cancelar : BUTTONS.comuns.voltar} className="astro-modal-cancel" disabled={pending} onClick={onCancel} type="button">{editable ? 'Cancelar' : 'Voltar'}</button>
      {editable && <PurpleButton data-track-action={BUTTONS.comuns.salvar_alteracoes} disabled={pending} type="submit">Salvar alterações</PurpleButton>}
    </div>
  </form>
}

export default AccountDetailsForm
