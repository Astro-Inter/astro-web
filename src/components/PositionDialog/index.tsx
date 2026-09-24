import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Position, PositionFormValues } from '../../types'
import { validatePosition, type PositionValidationErrors } from '../../utils/position'
import AstroIcon from '../AstroIcon'
import PurpleButton from '../PurpleButton'

interface PositionDialogProps {
  onClose: () => void
  onSave: (values: PositionFormValues, editingId?: string) => string | null
  position: Position | null
  units: string[]
}

function PositionDialog({ onClose, onSave, position, units }: PositionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState<PositionFormValues>(() => ({
    name: position?.name ?? '',
    collaboratorCount: String(position?.collaboratorCount ?? 0),
    unit: position?.unit ?? units[0] ?? '',
    active: position?.active ?? true,
  }))
  const [errors, setErrors] = useState<PositionValidationErrors>({})
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (!dialog.open) dialog.showModal()
    nameRef.current?.focus({ preventScroll: true })
    return () => { if (dialog.open) dialog.close() }
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextErrors = validatePosition(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const saveError = onSave({ ...values, name: values.name.trim() }, position?.id)
    if (saveError) {
      setFormError(saveError)
      return
    }

    dialogRef.current?.close()
  }

  return (
    <dialog
      aria-labelledby="position-dialog-title"
      className="position-dialog astro-scale-100"
      onClose={() => { if (!dialogRef.current?.open) onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }}
      ref={dialogRef}
    >
      <form noValidate onSubmit={handleSubmit}>
        <div className="position-dialog-heading">
          <h2 id="position-dialog-title">{position ? 'Editar cargo' : 'Adicionar cargo'}</h2>
          <button aria-label="Fechar" className="position-dialog-close" onClick={() => dialogRef.current?.close()} type="button"><AstroIcon name="close" /></button>
        </div>
        <p className="position-dialog-subtitle">Preencha as informações do cargo.</p>

        <div className="position-dialog-field">
          <label htmlFor="position-name">Nome do cargo</label>
          <input
            aria-describedby={errors.name ? 'position-name-error' : undefined}
            aria-invalid={Boolean(errors.name)}
            autoComplete="organization-title"
            id="position-name"
            maxLength={80}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ex.: Gerente"
            ref={nameRef}
            value={values.name}
          />
          {errors.name && <span id="position-name-error" role="alert">{errors.name}</span>}
        </div>

        <div className="position-dialog-row">
          <div className="position-dialog-field">
            <label htmlFor="position-count">Quantidade de colaboradores</label>
            <input
              aria-describedby={errors.collaboratorCount ? 'position-count-error' : undefined}
              aria-invalid={Boolean(errors.collaboratorCount)}
              id="position-count"
              inputMode="numeric"
              onChange={(event) => setValues((current) => ({ ...current, collaboratorCount: event.target.value.replace(/\D/g, '').slice(0, 6) }))}
              value={values.collaboratorCount}
            />
            {errors.collaboratorCount && <span id="position-count-error" role="alert">{errors.collaboratorCount}</span>}
          </div>
          <div className="position-dialog-field">
            <label htmlFor="position-unit">Unidade</label>
            <select id="position-unit" onChange={(event) => setValues((current) => ({ ...current, unit: event.target.value }))} value={values.unit}>
              {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
            {errors.unit && <span role="alert">{errors.unit}</span>}
          </div>
        </div>

        <label className="position-dialog-check" htmlFor="position-active">
          <input checked={values.active} id="position-active" onChange={(event) => setValues((current) => ({ ...current, active: event.target.checked }))} type="checkbox" />
          Cargo ativo
        </label>
        {formError && <p className="position-dialog-form-error" role="alert">{formError}</p>}

        <div className="position-dialog-actions">
          <button className="position-dialog-cancel" onClick={() => dialogRef.current?.close()} type="button">Cancelar</button>
          <PurpleButton type="submit">{position ? 'Salvar alterações' : 'Adicionar cargo'}</PurpleButton>
        </div>
      </form>
    </dialog>
  )
}

export default PositionDialog
