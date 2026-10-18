import { useActionFeedback } from '../../hooks/useActionFeedback'
import ActionLoading from '../actionLoading'
import ApiContentSkeleton from '../apiContentSkeleton'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useRef, useState, type FormEvent } from 'react'
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
  onSubmit: (values: ConformityFormValues) => string | null | Promise<string | null>
  loading?: boolean
  loadError?: string
  onRetry?: () => void
  open?: boolean
}

function ConformityFormModal({ dimmed = false, employee, employees, initialValues, nrs, onClose, onDismissRequest, onSubmit, loading = false, loadError = '', onRetry, open = true }: ConformityFormModalProps) {
  const editing = Boolean(employee)
  const [values, setValues] = useState<ConformityFormValues>(initialValues ?? { employeeId: '', nr: '', expiresAt: '' })
  const [errors, setErrors] = useState<ConformityValidationErrors>({})
  const notify = useActionFeedback()
  const [dateValid, setDateValid] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const unavailable = loading || Boolean(loadError) || submitting
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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>, dismiss: () => void) {
    event.preventDefault()
    if (unavailable || submittingRef.current) return
    const nextErrors = validateConformity(values, editing ? [initialValues?.employeeId ?? ''] : employees.map((item) => item.id), nrs, dateValid)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    submittingRef.current = true
    setSubmitting(true)
    let submitError: string | null
    try { submitError = await onSubmit(values) }
    catch (error: unknown) { submitError = error instanceof Error ? error.message : 'Não foi possível salvar a conformidade.' }
    submittingRef.current = false
    setSubmitting(false)
    if (submitError) {
      notify(submitError, 'error')
      return
    }

    if (!editing) dismiss()
  }

  function selectClassName(field: 'employeeId' | 'nr') {
    return `position-dialog-select${values[field] ? '' : ' position-dialog-select--placeholder'}${errors[field] ? ' position-dialog-select--invalid' : ''}`
  }

  return (
    <AppModal trackingName={editing ? DIALOG_NAMES.editar_conformidade : DIALOG_NAMES.adicionar_conformidade} dismissible={!submitting} className="position-dialog invite-manager-dialog conformity-form-modal" dimmed={dimmed} onClose={onClose} onDismissRequest={onDismissRequest} open={open} title={editing ? 'Editar conformidade' : 'Adicionar conformidade'}>
      {(dismiss) => <form data-track-submit={editing ? BUTTONS.comuns.salvar_alteracoes : BUTTONS.comuns.adicionar} aria-busy={loading || submitting} autoComplete="off" noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
        {employee && (
          <div className="account-profile-header conformity-form-employee">
            <div className="account-profile-photo"><span aria-hidden="true" className="manager-avatar manager-avatar--large">{getInitials(employee.name)}</span></div>
            <div className="account-profile-identity"><h3>{employee.name}</h3><p>{employee.email}</p></div>
          </div>
        )}
        {loading && <ApiContentSkeleton className="conformity-form-skeleton" label="Carregando dados da conformidade" fields={employee ? 2 : 3} columns={2} actions={0} />}
        {loadError && <div role="alert"><p>{loadError}</p><button className="astro-modal-cancel" onClick={onRetry} type="button">Tentar novamente</button></div>}
        <fieldset hidden={loading} className="conformity-form-fields" disabled={unavailable}>
          <div className="position-dialog-row conformity-form-row">
            {!employee && (
              <div className="position-dialog-field">
                <label htmlFor="conformity-form-employee">Colaborador</label>
                <ToolbarSelect trackingAction={BUTTONS.comuns.selecionar_opcao} className={selectClassName('employeeId')} id="conformity-form-employee" label="Colaborador" onValueChange={(employeeId) => update('employeeId', employeeId)} options={employeeOptions} value={values.employeeId} />
                {errors.employeeId && <span role="alert">{errors.employeeId}</span>}
              </div>
            )}
            <div className="position-dialog-field">
              <label htmlFor="conformity-form-nr">NR</label>
              <ToolbarSelect trackingAction={BUTTONS.comuns.nr} className={selectClassName('nr')} id="conformity-form-nr" label="NR" onValueChange={(nr) => update('nr', nr)} options={nrOptions} value={values.nr} />
              {errors.nr && <span role="alert">{errors.nr}</span>}
            </div>
            <div className="position-dialog-field">
              <label htmlFor="conformity-form-date">Data de validade</label>
              <FormDatePicker id="conformity-form-date" label="Data de validade" onChange={(expiresAt) => update('expiresAt', expiresAt)} onValidityChange={setDateValid} value={values.expiresAt} />
              {errors.expiresAt && <span role="alert">{errors.expiresAt}</span>}
            </div>
          </div>
        </fieldset>
        <ActionLoading active={submitting} />

        <div className="astro-modal-actions">
          <button data-track-action={BUTTONS.comuns.cancelar} className="astro-modal-cancel" disabled={submitting} onClick={dismiss} type="button">Cancelar</button>
          <PurpleButton data-track-action={editing ? BUTTONS.comuns.salvar_alteracoes : BUTTONS.comuns.adicionar} disabled={unavailable} type="submit">{editing ? 'Salvar alterações' : 'Adicionar'}</PurpleButton>
        </div>
      </form>}
    </AppModal>
  )
}

export default ConformityFormModal
