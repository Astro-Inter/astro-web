import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useState, type FormEvent } from 'react'
import type { ConformityFilters } from '../../types'
import type { ConformityType } from '../../types/conformity'
import { conformityOriginLabels, emptyConformityFilters, isConformityOrigin, validateConformityFilters, type ConformityFilterErrors } from '../../utils/conformity'
import AppModal from '../appModal'
import FormDatePicker from '../formDatePicker'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface ConformityFilterModalProps {
  type?: ConformityType
  filters: ConformityFilters
  nrs: readonly string[]
  onApply: (filters: ConformityFilters) => void
  onClose: () => void
}

function ConformityFilterModal({ type = 'COLABORADOR', filters, nrs, onApply, onClose }: ConformityFilterModalProps) {
  const originOptions = [
    { value: '', label: 'Selecione a origem', tone: 'muted' as const },
    ...Object.entries(conformityOriginLabels).filter(([origin]) => type === 'UNIDADE' ? origin !== 'EVENTO' : origin !== 'FORMULARIO').map(([, label]) => ({ value: label, label })),
  ]
  const [values, setValues] = useState<ConformityFilters>(filters)
  const [validDates, setValidDates] = useState({ from: true, to: true })
  const [errors, setErrors] = useState<ConformityFilterErrors>({})
  const nrOptions = [
    { value: '', label: 'Selecione a NR', tone: 'muted' as const },
    ...nrs.map((nr) => ({ value: nr, label: nr })),
  ]

  function update<Field extends keyof ConformityFilters>(field: Field, value: ConformityFilters[Field]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors({})
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>, dismiss: () => void) {
    event.preventDefault()
    const nextErrors = validateConformityFilters(values, validDates)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onApply(values)
    dismiss()
  }

  function selectClassName(field: 'nr' | 'origin') {
    return `position-dialog-select${values[field] ? '' : ' position-dialog-select--placeholder'}`
  }

  return (
    <AppModal trackingName={DIALOG_NAMES.filtros_conformidade} className="position-dialog invite-manager-dialog conformity-filter-modal" onClose={onClose} title="Filtros">
      {(dismiss) => <form data-track-submit={BUTTONS.comuns.aplicar_filtros} autoComplete="off" noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
        <div className="position-dialog-row conformity-form-row">
          <div className="position-dialog-field">
            <label htmlFor="conformity-filter-nr" id="conformity-filter-nr-label">NR</label>
            <ToolbarSelect trackingAction={BUTTONS.comuns.nr} className={selectClassName('nr')} id="conformity-filter-nr" label="NR" onValueChange={(nr) => update('nr', nr)} options={nrOptions} value={values.nr} labelledBy="conformity-filter-nr-label" />
          </div>
          <div className="position-dialog-field">
            <label htmlFor="conformity-filter-origin" id="conformity-filter-origin-label">Origem</label>
            <ToolbarSelect trackingAction={BUTTONS.comuns.origem} className={selectClassName('origin')} id="conformity-filter-origin" label="Origem" onValueChange={(origin) => update('origin', isConformityOrigin(origin) ? origin : '')} options={originOptions} searchable={false} value={values.origin} labelledBy="conformity-filter-origin-label" />
          </div>
          <div className="position-dialog-field">
            <label htmlFor="conformity-filter-from" id="conformity-filter-from-label">Data de validade (início)</label>
            <FormDatePicker error={errors.from} id="conformity-filter-from" labelledBy="conformity-filter-from-label" label="Data de validade inicial" onChange={(from) => update('from', from)} onValidityChange={(from) => setValidDates((current) => ({ ...current, from }))} value={values.from} />
          </div>
          <div className="position-dialog-field">
            <label htmlFor="conformity-filter-to" id="conformity-filter-to-label">Data de validade (fim)</label>
            <FormDatePicker error={errors.to} id="conformity-filter-to" labelledBy="conformity-filter-to-label" label="Data de validade final" onChange={(to) => update('to', to)} onValidityChange={(to) => setValidDates((current) => ({ ...current, to }))} value={values.to} />
          </div>
        </div>

        <div className="astro-modal-actions">
          <button data-track-action={BUTTONS.comuns.limpar_filtros} className="astro-modal-cancel" onClick={() => { onApply(emptyConformityFilters); dismiss() }} type="button">Limpar filtros</button>
          <PurpleButton data-track-action={BUTTONS.comuns.aplicar_filtros} type="submit">Aplicar filtros</PurpleButton>
        </div>
      </form>}
    </AppModal>
  )
}

export default ConformityFilterModal
