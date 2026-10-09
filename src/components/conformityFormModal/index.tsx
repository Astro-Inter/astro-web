import { useState, type FormEvent } from 'react'
import type { ConformityFormValues } from '../../types'
import { getInitials } from '../../utils/manager'
import { validateConformity, type ConformityValidationErrors } from '../../utils/conformity'
import AppModal from '../appModal'
import FormDatePicker from '../formDatePicker'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface ConformityFormModalProps {
  dimmed?: boolean
  employee?: { name: string; email: string }
  employees: readonly { id: string; name: string }[]
  initialValues?: ConformityFormValues
  nrs: readonly string[]
  onClose: () => void
  onDismissRequest?: () => void
  onSubmit: (values: ConformityFormValues) => string | null
  open?: boolean
}

function ConformityFormModal({ dimmed = false, employee, employees, initialValues, nrs, onClose, onDismissRequest, onSubmit, open = true }: ConformityFormModalProps) {
  const editing = Boolean(employee)
  const [values, setValues] = useState<ConformityFormValues>(initialValues ?? { employeeId: '', nr: '', expiresAt: '' })
  const [errors, setErrors] = useState<ConformityValidationErrors>({})
  const [formError, setFormError] = useState('')
  const [dateValid, setDateValid] = useState(true)
  const employeeOptions = [
    { value: '', label: 'Selecione o colaborador', tone: 'muted' as const },
    ...employees.map((item) => ({ value: item.id, label: item.name })),
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
    const nextErrors = validateConformity(values, employees.map((item) => item.id), nrs, dateValid)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const submitError = onSubmit(values)
    if (submitError) {
      setFormError(submitError)
      return
    }

    if (!editing) dismiss()
  }

  function selectClassName(field: 'employeeId' | 'nr') {
    return `position-dialog-select${values[field] ? '' : ' position-dialog-select--placeholder'}${errors[field] ? ' position-dialog-select--invalid' : ''}`
  }

  return (
    <AppModal className="position-dialog invite-manager-dialog conformity-form-modal" dimmed={dimmed} onClose={onClose} onDismissRequest={onDismissRequest} open={open} title={editing ? 'Editar conformidade' : 'Adicionar conformidade'}>
      {(dismiss) => <form autoComplete="off" noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
        {employee ? (
          <div className="account-profile-header conformity-form-employee">
            <div className="account-profile-photo"><span aria-hidden="true" className="manager-avatar manager-avatar--large">{getInitials(employee.name)}</span></div>
            <div className="account-profile-identity"><h3>{employee.name}</h3><p>{employee.email}</p></div>
          </div>
        ) : (
          <div className="position-dialog-field conformity-form-employee">
            <label htmlFor="conformity-form-employee">Colaborador</label>
            <ToolbarSelect className={selectClassName('employeeId')} id="conformity-form-employee" label="Colaborador" onValueChange={(employeeId) => update('employeeId', employeeId)} options={employeeOptions} value={values.employeeId} />
            {errors.employeeId && <span role="alert">{errors.employeeId}</span>}
          </div>
        )}
        <div className="position-dialog-row conformity-form-row">
          <div className="position-dialog-field">
            <label htmlFor="conformity-form-nr">NR</label>
            <ToolbarSelect className={selectClassName('nr')} id="conformity-form-nr" label="NR" onValueChange={(nr) => update('nr', nr)} options={nrOptions} value={values.nr} />
            {errors.nr && <span role="alert">{errors.nr}</span>}
          </div>
          <div className="position-dialog-field">
            <label htmlFor="conformity-form-date">Data de validade</label>
            <FormDatePicker id="conformity-form-date" label="Data de validade" onChange={(expiresAt) => update('expiresAt', expiresAt)} onValidityChange={setDateValid} value={values.expiresAt} />
          </div>
        </div>
        {formError && <p className="position-dialog-form-error" role="alert">{formError}</p>}

        <div className="astro-modal-actions">
          <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
          <PurpleButton type="submit">{editing ? 'Salvar alterações' : 'Adicionar'}</PurpleButton>
        </div>
      </form>}
    </AppModal>
  )
}

export default ConformityFormModal
