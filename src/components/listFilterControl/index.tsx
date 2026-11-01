import { useId, useRef, useState } from 'react'
import type { ListFilterControlProps } from '../../types/listFilters'
import { stepFilterCount, validateListFilters } from '../../utils/listFilters'
import { BUTTONS } from '../../gtm/buttons'
import AppModal from '../appModal'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

function ListFilterControl({ label, fields, values, onApply }: ListFilterControlProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(values)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const trigger = useRef<HTMLButtonElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const id = useId()
  const count = fields.filter(field => Boolean(values[field.id])).length
  return <>
    <button type="button" className="conformity-filter-button" ref={trigger} aria-label={`${label}${count ? `, ${count} ${count === 1 ? 'filtro ativo' : 'filtros ativos'}` : ''}`} aria-haspopup="dialog" aria-expanded={open} data-track-action={BUTTONS.comuns.filtro} onClick={() => { setDraft(values); setErrors({}); setOpen(true) }}>
      Filtros{count > 0 && <span aria-hidden="true">({count})</span>}<AstroIcon name="chevron-down" />
    </button>
    {open && <AppModal title="Filtros" className="position-dialog invite-manager-dialog conformity-filter-modal" onClose={() => { setOpen(false); trigger.current?.focus() }}>
      {dismiss => <form ref={form} autoComplete="off" noValidate data-track-submit={BUTTONS.comuns.aplicar_filtros} onSubmit={event => {
        event.preventDefault()
        const nextErrors = validateListFilters(fields, draft)
        setErrors(nextErrors)
        if (Object.keys(nextErrors).length) { requestAnimationFrame(() => form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus()); return }
        onApply(draft)
        dismiss()
      }}>
        <div className="position-dialog-row conformity-form-row">
          {fields.map(field => {
            const fieldId = `${id}-${field.id}`
            const error = errors[field.id]
            const update = (value: string) => { setDraft(current => ({ ...current, [field.id]: value })); setErrors({}) }
            return <div key={field.id} className="position-dialog-field">
              <label htmlFor={fieldId} id={`${fieldId}-label`}>{field.label}</label>
              {field.kind === 'number' ? <>
                <div className="list-filter-number">
                  <input id={fieldId} type="number" min={0} step={1} inputMode="numeric" placeholder="Sem limite" value={draft[field.id] ?? ''} onChange={event => update(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : undefined} />
                  <div className="list-filter-number-actions">
                    <button type="button" aria-label={`Aumentar ${field.label.toLocaleLowerCase('pt-BR')}`} aria-controls={fieldId} disabled={Number(draft[field.id]) >= Number.MAX_SAFE_INTEGER} onClick={() => update(stepFilterCount(draft[field.id] ?? '', 1))}><AstroIcon className="list-filter-number-increase" name="chevron-down" /></button>
                    <button type="button" aria-label={`Diminuir ${field.label.toLocaleLowerCase('pt-BR')}`} aria-controls={fieldId} disabled={!draft[field.id] || Number(draft[field.id]) <= 0} onClick={() => update(stepFilterCount(draft[field.id] ?? '', -1))}><AstroIcon name="chevron-down" /></button>
                  </div>
                </div>
                {error && <p className="login-field-error" id={`${fieldId}-error`} role="alert">{error}</p>}
              </> : <ToolbarSelect id={fieldId} labelledBy={`${fieldId}-label`} label={field.label} className="position-dialog-select" value={draft[field.id] ?? ''} options={field.options ?? []} error={error} onValueChange={update} />}
            </div>
          })}
        </div>
        <div className="astro-modal-actions">
          <button type="button" className="astro-modal-cancel" data-track-action={BUTTONS.comuns.limpar_filtros} onClick={() => { onApply(Object.fromEntries(fields.map(field => [field.id, '']))); dismiss() }}>Limpar filtros</button>
          <PurpleButton type="submit" data-track-action={BUTTONS.comuns.aplicar_filtros}>Aplicar filtros</PurpleButton>
        </div>
      </form>}
    </AppModal>}
  </>
}

export default ListFilterControl
