import { useState, type FormEvent } from 'react'
import type { ConformityFilters } from '../../types'
import { emptyConformityFilters, validateConformityFilters, type ConformityFilterErrors } from '../../utils/conformity'
import AppModal from '../appModal'
import FormDatePicker from '../formDatePicker'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

const originOptions = [
  { value: '', label: 'Selecione a origem', tone: 'muted' as const },
  { value: 'Evento', label: 'Evento' },
  { value: 'Manual', label: 'Manual' },
]

interface ConformityFilterModalProps {
  filters: ConformityFilters
  nrs: readonly string[]
  onApply: (filters: ConformityFilters) => void
  onClose: () => void
}

function ConformityFilterModal({ filters, nrs, onApply, onClose }: ConformityFilterModalProps) {
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
    <AppModal className="position-dialog invite-manager-dialog conformity-filter-modal" onClose={onClose} title="Filtros">
      {(dismiss) => <form autoComplete="off" noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
        <div className="position-dialog-row conformity-form-row">
          <div className="position-dialog-field">
            <label htmlFor="conformity-filter-nr">NR</label>
            <ToolbarSelect className={selectClassName('nr')} id="conformity-filter-nr" label="NR" onValueChange={(nr) => update('nr', nr)} options={nrOptions} value={values.nr} />
          </div>
          <div className="position-dialog-field">
            <label htmlFor="conformity-filter-origin">Origem</label>
            <ToolbarSelect className={selectClassName('origin')} id="conformity-filter-origin" label="Origem" onValueChange={(origin) => update('origin', origin === 'Evento' || origin === 'Manual' ? origin : '')} options={originOptions} searchable={false} value={values.origin} />
          </div>
          <div className="position-dialog-field">
            <label htmlFor="conformity-filter-from">Data de validade (início)</label>
            <FormDatePicker id="conformity-filter-from" label="Data de validade inicial" onChange={(from) => update('from', from)} onValidityChange={(from) => setValidDates((current) => ({ ...current, from }))} value={values.from} />
            {errors.from && validDates.from && <span role="alert">{errors.from}</span>}
          </div>
          <div className="position-dialog-field">
            <label htmlFor="conformity-filter-to">Data de validade (fim)</label>
            <FormDatePicker id="conformity-filter-to" label="Data de validade final" onChange={(to) => update('to', to)} onValidityChange={(to) => setValidDates((current) => ({ ...current, to }))} value={values.to} />
            {errors.to && validDates.to && <span role="alert">{errors.to}</span>}
          </div>
        </div>

        <div className="astro-modal-actions">
          <button className="astro-modal-cancel" onClick={() => { onApply(emptyConformityFilters); dismiss() }} type="button">Limpar filtros</button>
          <PurpleButton type="submit">Aplicar filtros</PurpleButton>
        </div>
      </form>}
    </AppModal>
  )
}

export default ConformityFilterModal
