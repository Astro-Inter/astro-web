import { useState, type FormEvent } from 'react'
import type { Position, PositionFormValues } from '../../types'
import { validatePosition, type PositionValidationErrors } from '../../utils/position'
import PurpleButton from '../PurpleButton'
import ToolbarSelect from '../ToolbarSelect'
import AppModal from '../AppModal'

const statusOptions = [
  { value: '', label: 'Selecione o status', tone: 'muted' as const },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
]

interface PositionDialogProps {
  dimmed?: boolean
  onClose: () => void
  onRequestConfirmation: (values: PositionFormValues, editingId: string) => string | null
  onSave: (values: PositionFormValues, editingId?: string) => string | null
  open?: boolean
  position: Position | null
  units: string[]
}

function PositionDialog({ dimmed = false, onClose, onRequestConfirmation, onSave, open = true, position, units }: PositionDialogProps) {
  const [values, setValues] = useState<PositionFormValues>(() => ({
    name: position?.name ?? '',
    collaboratorCount: String(position?.collaboratorCount ?? 0),
    unit: position?.unit ?? units[0] ?? '',
    active: position?.active ?? true,
  }))
  const [errors, setErrors] = useState<PositionValidationErrors>({})
  const [formError, setFormError] = useState('')
  const [status, setStatus] = useState(position ? (position.active ? 'active' : 'inactive') : '')

  function handleSubmit(event: FormEvent<HTMLFormElement>, dismiss: () => void) {
    event.preventDefault()
    const nextErrors = validatePosition(values, status)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const preparedValues = { ...values, name: values.name.trim() }
    const saveError = position
      ? onRequestConfirmation(preparedValues, position.id)
      : onSave(preparedValues)
    if (saveError) {
      setFormError(saveError)
      return
    }

    if (!position) dismiss()
  }

  return (
    <AppModal className={`position-dialog${dimmed ? ' position-dialog--dimmed' : ''}`} onClose={onClose} open={open} title={position ? 'Editar cargo' : 'Adicionar cargo'}>
      {(dismiss) => <form autoComplete="off" noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
        <div className="position-dialog-row">
          <div className="position-dialog-field">
            <label htmlFor="position-name">Nome do cargo</label>
            <input
              aria-describedby={errors.name ? 'position-name-error' : undefined}
              aria-invalid={Boolean(errors.name)}
              autoComplete="off"
              id="position-name"
              maxLength={80}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              placeholder="Digite o nome do cargo"
              value={values.name}
            />
            {errors.name && <span id="position-name-error" role="alert">{errors.name}</span>}
          </div>
          <div className="position-dialog-field">
            <span className="position-dialog-label">Status</span>
            <ToolbarSelect
              className={status ? 'position-dialog-select' : 'position-dialog-select position-dialog-select--placeholder'}
              label="Status do cargo"
              onValueChange={(nextStatus) => {
                setStatus(nextStatus)
                setValues((current) => ({ ...current, active: nextStatus === 'active' }))
                setErrors((current) => ({ ...current, status: undefined }))
              }}
              options={statusOptions}
              value={status}
            />
            {errors.status && <span role="alert">{errors.status}</span>}
          </div>
        </div>
        {formError && <p className="position-dialog-form-error" role="alert">{formError}</p>}

        <div className="astro-modal-actions">
          <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
          <PurpleButton type="submit">{position ? 'Salvar' : 'Adicionar'}</PurpleButton>
        </div>
      </form>}
    </AppModal>
  )
}

export default PositionDialog
