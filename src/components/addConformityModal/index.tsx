import { useState, type FormEvent } from 'react'
import type { ConformityFormValues } from '../../types'
import { validateConformity, type ConformityValidationErrors } from '../../utils/conformity'
import AppModal from '../appModal'
import FormDatePicker from '../formDatePicker'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface AddConformityModalProps {
  employees: readonly { id: string; name: string }[]
  nrs: readonly string[]
  onAdd: (values: ConformityFormValues) => string | null
  onClose: () => void
}

function AddConformityModal({ employees, nrs, onAdd, onClose }: AddConformityModalProps) {
  const [values, setValues] = useState<ConformityFormValues>({ employeeId: '', nr: '', expiresAt: '' })
  const [errors, setErrors] = useState<ConformityValidationErrors>({})
  const [formError, setFormError] = useState('')
  const [dateValid, setDateValid] = useState(true)
  const employeeOptions = [
    { value: '', label: 'Selecione o colaborador', tone: 'muted' as const },
    ...employees.map((employee) => ({ value: employee.id, label: employee.name })),
  ]
  const nrOptions = [
    { value: '', label: 'Selecione a NR', tone: 'muted' as const },
    ...nrs.map((nr) => ({ value: nr, label: nr })),
  ]

  function update<Field extends keyof ConformityFormValues>(field: Field, value: ConformityFormValues[Field]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setFormError('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>, dismiss: () => void) {
    event.preventDefault()
    const nextErrors = validateConformity(values, employees.map((employee) => employee.id), nrs, dateValid)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const addError = onAdd(values)
    if (addError) {
      setFormError(addError)
      return
    }

    dismiss()
  }

  function selectClassName(field: 'employeeId' | 'nr') {
    return `position-dialog-select${values[field] ? '' : ' position-dialog-select--placeholder'}${errors[field] ? ' position-dialog-select--invalid' : ''}`
  }

  return (
    <AppModal className="position-dialog invite-manager-dialog add-conformity-modal" onClose={onClose} title="Adicionar conformidade">
      {(dismiss) => <form autoComplete="off" noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
        <div className="position-dialog-field add-conformity-employee">
          <label htmlFor="add-conformity-employee">Colaborador</label>
          <ToolbarSelect className={selectClassName('employeeId')} id="add-conformity-employee" label="Colaborador" onValueChange={(employeeId) => update('employeeId', employeeId)} options={employeeOptions} value={values.employeeId} />
          {errors.employeeId && <span role="alert">{errors.employeeId}</span>}
        </div>
        <div className="position-dialog-row add-conformity-row">
          <div className="position-dialog-field">
            <label htmlFor="add-conformity-nr">NR</label>
            <ToolbarSelect className={selectClassName('nr')} id="add-conformity-nr" label="NR" onValueChange={(nr) => update('nr', nr)} options={nrOptions} value={values.nr} />
            {errors.nr && <span role="alert">{errors.nr}</span>}
          </div>
          <div className="position-dialog-field">
            <label htmlFor="add-conformity-date">Data de validade</label>
            <FormDatePicker id="add-conformity-date" label="Data de validade" onChange={(expiresAt) => update('expiresAt', expiresAt)} onValidityChange={setDateValid} value={values.expiresAt} />
            {errors.expiresAt && dateValid && <span role="alert">{errors.expiresAt}</span>}
          </div>
        </div>
        {formError && <p className="position-dialog-form-error" role="alert">{formError}</p>}

        <div className="astro-modal-actions">
          <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
          <PurpleButton type="submit">Adicionar</PurpleButton>
        </div>
      </form>}
    </AppModal>
  )
}

export default AddConformityModal
