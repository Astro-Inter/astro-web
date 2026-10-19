import { useActionFeedback } from '../../hooks/useActionFeedback'
import ActionLoading from '../actionLoading'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useRef, useState, type FormEvent } from 'react'
import type { Position, PositionFormValues } from '../../types'
import { validatePosition, type PositionValidationErrors } from '../../utils/position'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'
import AppModal from '../appModal'

const statusOptions = [
  { value: '', label: 'Selecione o status', tone: 'muted' as const },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

interface PositionDialogProps {
  dimmed?: boolean
  onClose: () => void
  onRequestConfirmation: (values: PositionFormValues, editingId: string) => string | null
  onSave: (values: PositionFormValues, editingId?: string) => Promise<string | null>
  open?: boolean
  position: Position | null
}

function PositionDialog({ dimmed = false, onClose, onRequestConfirmation, onSave, open = true, position }: PositionDialogProps) {
  const [values, setValues] = useState<PositionFormValues>(() => ({
    name: position?.name ?? '',
    active: position?.active ?? true,
  }))
  const [errors, setErrors] = useState<PositionValidationErrors>({})
  const notify = useActionFeedback()
  const [status, setStatus] = useState(position ? (position.active ? 'active' : 'inactive') : '')

  const submittingRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>, dismiss: () => void) {
    event.preventDefault()
    if (submittingRef.current) return
    const nextErrors = validatePosition(values, status)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const preparedValues = { ...values, name: values.name.trim() }
    submittingRef.current = true
    setSubmitting(true)
    try {
      const saveError = position
        ? onRequestConfirmation(preparedValues, position.id)
        : await onSave(preparedValues)
      if (saveError) notify(saveError, 'error')
      else if (!position) dismiss()
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : 'Não foi possível salvar o cargo.', 'error')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <AppModal trackingName={position ? DIALOG_NAMES.editar_cargo : DIALOG_NAMES.adicionar_cargo} className="position-dialog" dimmed={dimmed} dismissible={!submitting} onClose={onClose} open={open} title={position ? 'Editar cargo' : 'Adicionar cargo'}>
      {(dismiss) => <form data-track-submit={position ? BUTTONS.comuns.salvar : BUTTONS.comuns.adicionar} aria-busy={submitting} autoComplete="off" noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
        <fieldset disabled={submitting} className="position-dialog-fields">
          <div className="position-dialog-row">
            <div className="position-dialog-field">
              <label htmlFor="position-name">Nome do cargo</label>
              <input
                aria-describedby={errors.name ? 'position-name-error' : undefined}
                aria-invalid={Boolean(errors.name)}
                autoComplete="off"
                id="position-name"
                maxLength={80}
                onChange={(event) => {
                  setValues((current) => ({ ...current, name: event.target.value }))
                  setErrors((current) => ({ ...current, name: undefined }))
                }}
                placeholder="Digite o nome do cargo"
                value={values.name}
              />
              {errors.name && <p className="login-field-error" id="position-name-error" role="alert">{errors.name}</p>}
            </div>
            <div className="position-dialog-field">
              <span className="position-dialog-label">Status</span>
              <ToolbarSelect trackingAction={BUTTONS.comuns.cargo}
                id="position-status"
                error={errors.status}
                className={`position-dialog-select${status ? '' : ' position-dialog-select--placeholder'}${errors.status ? ' position-dialog-select--invalid' : ''}`}
                label="Status do cargo"
                disabled={submitting}
                onValueChange={(nextStatus) => {
                  setStatus(nextStatus)
                  setValues((current) => ({ ...current, active: nextStatus === 'active' }))
                  setErrors((current) => ({ ...current, status: undefined }))
                }}
                options={statusOptions}
                value={status}
              />
              {errors.status && <p className="login-field-error" id="position-status-error" role="alert">{errors.status}</p>}
            </div>
          </div>
        </fieldset>
        <ActionLoading active={submitting} />

        <div className="astro-modal-actions">
          <button data-track-action={BUTTONS.comuns.cancelar} className="astro-modal-cancel" disabled={submitting} onClick={dismiss} type="button">Cancelar</button>
          <PurpleButton data-track-action={position ? BUTTONS.comuns.salvar : BUTTONS.comuns.adicionar} disabled={submitting} type="submit">{position ? 'Salvar' : 'Adicionar'}</PurpleButton>
        </div>
      </form>}
    </AppModal>
  )
}

export default PositionDialog
