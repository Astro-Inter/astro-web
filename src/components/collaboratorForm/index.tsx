import { useRef, useState, type FormEvent } from 'react'
import type { CollaboratorDetails, CollaboratorFormValues, CollaboratorOptions, CollaboratorStatus } from '../../types/collaborator'
import { collaboratorModalityLabels, collaboratorStatusLabels, validateCollaborator, type CollaboratorValidationErrors } from '../../utils/collaborator'
import { formatCpfCnpj } from '../../utils/inputFormatting'
import FormField from '../formField'
import ToolbarSelect from '../toolbarSelect'
import PurpleButton from '../purpleButton'
import CollaboratorIdentity from '../collaboratorIdentity'

interface CollaboratorFormProps {
  collaborator: CollaboratorDetails | null
  mode: 'create' | 'view' | 'edit'
  options: CollaboratorOptions
  disabled: boolean
  saving: boolean
  onCancel: () => void
  onSubmit: (values: CollaboratorFormValues) => string | null | Promise<string | null>
}

function CollaboratorForm({ collaborator, mode, options, disabled, saving, onCancel, onSubmit }: CollaboratorFormProps) {
  const editable = mode !== 'view'
  const [values, setValues] = useState<CollaboratorFormValues>(() => collaborator
    ? { name: collaborator.name, cpf: collaborator.cpf, email: collaborator.email, roleId: collaborator.roleId, unitId: collaborator.unitId, modality: collaborator.modality, status: collaborator.status }
    : { name: '', cpf: '', email: '', roleId: '', unitId: '', modality: '', status: 'PRE_CADASTRADO' })
  const [errors, setErrors] = useState<CollaboratorValidationErrors>({})
  const [submission, setSubmission] = useState({ saving: false, error: '' })
  const busy = useRef(false)

  function update<Field extends keyof CollaboratorFormValues>(field: Field, value: CollaboratorFormValues[Field]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmission((current) => ({ ...current, error: '' }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editable || disabled || busy.current) return
    const prepared = { ...values, name: values.name.trim(), email: values.email.trim().toLowerCase() }
    const nextErrors = validateCollaborator(prepared)
    if (!unitOptions.some((row) => row.value === values.unitId)) nextErrors.unitId = 'Selecione uma unidade disponível.'
    if (!positionOptions.some((row) => row.value === values.roleId)) nextErrors.roleId = 'Selecione um cargo disponível.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    busy.current = true
    setSubmission({ saving: true, error: '' })
    try {
      const error = await onSubmit(prepared)
      setSubmission({ saving: false, error: error ?? '' })
      if (!error && mode === 'create') onCancel()
    } catch (error: unknown) {
      setSubmission({ saving: false, error: error instanceof Error ? error.message : 'Não foi possível salvar o colaborador.' })
    } finally { busy.current = false }
  }

  const unitOptions = options.units.filter((row) => row.active || row.id === collaborator?.unitId).map((row) => ({ label: row.name, value: row.id }))
  if (collaborator && !unitOptions.some((row) => row.value === collaborator.unitId)) unitOptions.push({ label: collaborator.unit, value: collaborator.unitId })
  const positionOptions = options.positions.filter((row) => row.active || row.id === collaborator?.roleId).map((row) => ({ label: row.name, value: row.id }))
  if (collaborator && !positionOptions.some((row) => row.value === collaborator.roleId)) positionOptions.push({ label: collaborator.position, value: collaborator.roleId })
  const statusOptions = (['PRE_CADASTRADO', 'ATIVO', 'DESATIVADO'] as const)
    .filter((status) => status !== 'PRE_CADASTRADO' || collaborator?.status === status)
    .filter((status) => status !== 'ATIVO' || collaborator?.status !== 'PRE_CADASTRADO')
    .map((status) => ({ label: collaboratorStatusLabels[status], value: status }))
  const locked = disabled || submission.saving

  function select(field: 'unitId' | 'roleId' | 'modality' | 'status', label: string, choices: { label: string; value: string }[]) {
    const id = `collaborator-${field}`
    return <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <ToolbarSelect className="account-field-select" disabled={locked} error={errors[field]} id={id} label={label}
        onValueChange={(value) => {
          if (field === 'modality') update(field, value as CollaboratorFormValues['modality'])
          else if (field === 'status') update(field, value as CollaboratorStatus)
          else update(field, value)
        }} options={[{ label: `Selecione ${label.toLowerCase()}`, value: '' }, ...choices]} value={values[field]} />
      {errors[field] && <span id={`${id}-error`} role="alert">{errors[field]}</span>}
    </div>
  }

  return <form aria-busy={saving || submission.saving} className="account-details-form" noValidate onSubmit={(event) => { void handleSubmit(event) }}>
    {collaborator && <div className="account-profile-header">
      <div className="account-profile-photo"><CollaboratorIdentity large name={collaborator.name} photoUrl={collaborator.profilePhotoUrl} initials={collaborator.avatarInitials} /></div>
      <div className="account-profile-identity"><h3>{collaborator.name}</h3><p>{collaborator.email}</p></div>
    </div>}
    {mode === 'create' && <p className="astro-modal-description">O colaborador será pré-cadastrado. A conclusão do cadastro segue o fluxo por e-mail.</p>}
    <fieldset className="position-dialog-fields" disabled={locked}>
      <legend className="sr-only">Dados do colaborador</legend>
      <div className="account-details-grid">
        <FormField error={errors.name} id="collaborator-name" label="Nome" maxLength={255} onChange={(event) => update('name', event.target.value)} readOnly={!editable} value={values.name} />
        <FormField error={errors.cpf} id="collaborator-cpf" inputMode="numeric" label="CPF" maxLength={14} onChange={(event) => update('cpf', formatCpfCnpj(event.target.value.replace(/\D/g, '').slice(0, 11)))} placeholder="Não informado" readOnly={!editable} value={values.cpf} />
        <FormField error={errors.email} id="collaborator-email" label="E-mail" maxLength={255} onChange={(event) => update('email', event.target.value)} readOnly={!editable} type="email" value={values.email} />
        {editable ? select('unitId', 'Unidade', unitOptions) : <FormField id="collaborator-unitId" label="Unidade" readOnly value={collaborator?.unit ?? ''} />}
        {editable ? select('roleId', 'Cargo', positionOptions) : <FormField id="collaborator-roleId" label="Cargo" readOnly value={collaborator?.position ?? ''} />}
        {editable ? select('modality', 'Modalidade', Object.entries(collaboratorModalityLabels).map(([value, label]) => ({ value, label }))) : <FormField id="collaborator-modality" label="Modalidade" placeholder="Não informado" readOnly value={values.modality ? collaboratorModalityLabels[values.modality] : ''} />}
        {mode === 'edit' ? select('status', 'Status', statusOptions) : <FormField id="collaborator-status" label="Status" readOnly value={collaboratorStatusLabels[values.status]} />}
      </div>
    </fieldset>
    {submission.saving && <p role="status">Salvando colaborador...</p>}
    {submission.error && <p className="manager-details-form-error" role="alert">{submission.error}</p>}
    <div className="astro-modal-actions">
      <button className="astro-modal-cancel" disabled={saving || submission.saving} onClick={onCancel} type="button">{editable ? 'Cancelar' : 'Voltar'}</button>
      {editable && <PurpleButton disabled={locked} type="submit">{mode === 'create' ? 'Adicionar' : 'Salvar alterações'}</PurpleButton>}
    </div>
  </form>
}

export default CollaboratorForm
