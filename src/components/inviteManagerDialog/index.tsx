import { useState, type FormEvent } from 'react'
import type { ManagerInviteValues } from '../../types'
import type { EventCollaborator } from '../../types/eventCreation'
import { validateManagerInvite, type ManagerInviteValidationErrors } from '../../utils/manager'
import AppModal from '../appModal'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

const statusOptions = [
  { value: '', label: 'Selecione o status', tone: 'muted' as const },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

interface InviteManagerDialogProps {
  candidates: readonly Pick<EventCollaborator, 'id' | 'email'>[]
  onClose: () => void
  onInvite: (values: ManagerInviteValues) => string | null
}

function InviteManagerDialog({ candidates, onClose, onInvite }: InviteManagerDialogProps) {
  const [values, setValues] = useState<ManagerInviteValues>({ collaboratorId: '', status: '' })
  const [errors, setErrors] = useState<ManagerInviteValidationErrors>({})
  const [formError, setFormError] = useState('')
  const emailOptions = [
    { value: '', label: 'Selecione o colaborador', tone: 'muted' as const },
    ...candidates.map((candidate) => ({ value: candidate.id, label: candidate.email })),
  ]

  function handleSubmit(event: FormEvent<HTMLFormElement>, dismiss: () => void) {
    event.preventDefault()
    const nextErrors = validateManagerInvite(values, candidates.map((candidate) => candidate.id))
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length > 0) return

    const inviteError = onInvite(values)
    if (inviteError) {
      setFormError(inviteError)
      return
    }

    dismiss()
  }

  return (
    <AppModal className="position-dialog invite-manager-dialog" onClose={onClose} title="Convidar gestor">
      {(dismiss) => <form autoComplete="off" noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
        <div className="position-dialog-row">
          <div className="position-dialog-field">
            <label htmlFor="invite-manager-email">E-mail</label>
            <ToolbarSelect
              className={`position-dialog-select${values.collaboratorId ? '' : ' position-dialog-select--placeholder'}${errors.collaboratorId ? ' position-dialog-select--invalid' : ''}`}
              id="invite-manager-email"
              label="E-mail do colaborador"
              onValueChange={(collaboratorId) => {
                setValues((current) => ({ ...current, collaboratorId }))
                setErrors((current) => ({ ...current, collaboratorId: undefined }))
                setFormError('')
              }}
              options={emailOptions}
              value={values.collaboratorId}
            />
            {errors.collaboratorId && <span role="alert">{errors.collaboratorId}</span>}
          </div>
          <div className="position-dialog-field">
            <label htmlFor="invite-manager-status">Status</label>
            <ToolbarSelect
              className={`position-dialog-select${values.status ? '' : ' position-dialog-select--placeholder'}${errors.status ? ' position-dialog-select--invalid' : ''}`}
              id="invite-manager-status"
              label="Status do gestor"
              onValueChange={(status) => {
                setValues((current) => ({ ...current, status: status === 'active' || status === 'inactive' ? status : '' }))
                setErrors((current) => ({ ...current, status: undefined }))
                setFormError('')
              }}
              options={statusOptions}
              value={values.status}
            />
            {errors.status && <span role="alert">{errors.status}</span>}
          </div>
        </div>
        {formError && <p className="position-dialog-form-error" role="alert">{formError}</p>}

        <div className="astro-modal-actions">
          <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
          <PurpleButton type="submit">Convidar</PurpleButton>
        </div>
      </form>}
    </AppModal>
  )
}

export default InviteManagerDialog
