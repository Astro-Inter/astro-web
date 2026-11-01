import { useActionFeedback } from '../../hooks/useActionFeedback'
import ActionLoading from '../actionLoading'
import ApiContentSkeleton from '../apiContentSkeleton'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useRef, useState, type FormEvent } from 'react'
import type { ManagerInviteValues } from '../../types'
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
  candidates: readonly { id: string; email: string }[]
  loading: boolean
  error: string
  saving: boolean
  onRetry: () => void
  onClose: () => void
  onInvite: (values: ManagerInviteValues) => Promise<string | null>
}

function InviteManagerDialog({ candidates, loading, error, saving, onRetry, onClose, onInvite }: InviteManagerDialogProps) {
  const [values, setValues] = useState<ManagerInviteValues>({ collaboratorId: '', status: '' })
  const [errors, setErrors] = useState<ManagerInviteValidationErrors>({})
  const notify = useActionFeedback()
  const busy = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const locked = loading || Boolean(error) || saving || submitting
  const emailOptions = [
    { value: '', label: 'Selecione o colaborador', tone: 'muted' as const },
    ...candidates.map((candidate) => ({ value: candidate.id, label: candidate.email })),
  ]

  async function handleSubmit(event: FormEvent<HTMLFormElement>, dismiss: () => void) {
    event.preventDefault()
    if (locked || busy.current) return
    const nextErrors = validateManagerInvite(values, candidates.map((candidate) => candidate.id))
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    busy.current = true
    setSubmitting(true)
    try {
      const inviteError = await onInvite(values)
      if (inviteError) notify(inviteError, 'error')
      else dismiss()
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível promover o colaborador.', 'error')
    } finally {
      busy.current = false
      setSubmitting(false)
    }
  }

  return (
    <AppModal trackingName={DIALOG_NAMES.convidar_gestor} className="position-dialog invite-manager-dialog" dismissible={!saving && !submitting} onClose={onClose} title="Promover a gestor">
      {(dismiss) => <form data-track-submit={BUTTONS.comuns.convidar} aria-busy={saving || submitting} autoComplete="off" noValidate onSubmit={(event) => { void handleSubmit(event, dismiss) }}>
        {loading && <ApiContentSkeleton className="dialog-row-skeleton" label="Carregando colaboradores ativos" fields={2} actions={0} />}
        {error && <div className="position-api-feedback"><p role="alert">{error}</p><button data-track-action={BUTTONS.comuns.tentar_novamente} onClick={onRetry} type="button">Tentar novamente</button></div>}
        {!loading && !error && candidates.length === 0 && <p role="status">Nenhum colaborador ativo disponível para promoção.</p>}
        <ActionLoading active={submitting} />
        <div hidden={loading} className="position-dialog-row">
          <div className="position-dialog-field">
            <label htmlFor="invite-manager-email" id="invite-manager-email-label">E-mail</label>
            <ToolbarSelect trackingAction={BUTTONS.comuns.colaborador}
              className={`position-dialog-select${values.collaboratorId ? '' : ' position-dialog-select--placeholder'}${errors.collaboratorId ? ' position-dialog-select--invalid' : ''}`}
              id="invite-manager-email"
              disabled={locked}
              error={errors.collaboratorId}
              label="E-mail do colaborador"
              onValueChange={(collaboratorId) => {
                setValues((current) => ({ ...current, collaboratorId }))
                setErrors((current) => ({ ...current, collaboratorId: undefined }))
              }}
              options={emailOptions}
              value={values.collaboratorId} labelledBy="invite-manager-email-label"
            />
            {errors.collaboratorId && <p className="login-field-error" id="invite-manager-email-error" role="alert">{errors.collaboratorId}</p>}
          </div>
          <div className="position-dialog-field">
            <label htmlFor="invite-manager-status" id="invite-manager-status-label">Status</label>
            <ToolbarSelect trackingAction={BUTTONS.comuns.status}
              className={`position-dialog-select${values.status ? '' : ' position-dialog-select--placeholder'}${errors.status ? ' position-dialog-select--invalid' : ''}`}
              id="invite-manager-status"
              disabled={locked}
              error={errors.status}
              label="Status do gestor"
              onValueChange={(status) => {
                setValues((current) => ({ ...current, status: status === 'active' || status === 'inactive' ? status : '' }))
                setErrors((current) => ({ ...current, status: undefined }))
              }}
              options={statusOptions}
              value={values.status} labelledBy="invite-manager-status-label"
            />
            {errors.status && <p className="login-field-error" id="invite-manager-status-error" role="alert">{errors.status}</p>}
          </div>
        </div>

        <div className="astro-modal-actions">
          <button data-track-action={BUTTONS.comuns.cancelar} className="astro-modal-cancel" disabled={saving || submitting} onClick={dismiss} type="button">Cancelar</button>
          <PurpleButton data-track-action={BUTTONS.comuns.convidar} disabled={locked || candidates.length === 0} type="submit">Promover a gestor</PurpleButton>
        </div>
      </form>}
    </AppModal>
  )
}

export default InviteManagerDialog
