import { useState } from 'react'
import { BUTTONS } from '../../gtm/buttons'
import type { EventDraft } from '../../types/eventCreation'
import type { EventNrOption } from '../../types/events'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'
import { formatRegulatoryStandardCode } from '../../utils/regulatoryStandardCode'
import { validateEventInformation } from '../../utils/eventInformationValidation'

interface EventInformationModalProps {
  draft: EventDraft
  onCancel: () => void
  onChange: (changes: Partial<EventDraft>) => void
  onContinue: () => void
  editing?: boolean
  detailsLocked?: boolean
  nrs: readonly EventNrOption[]
  loading?: boolean
}

function EventInformationModal({ draft, onCancel, onChange, onContinue, nrs, loading = false, editing = false, detailsLocked = false }: EventInformationModalProps) {
  const [attempted, setAttempted] = useState(false)
  const errors = attempted ? validateEventInformation(draft) : {}
  const nrOptions = [{ value: '', label: 'Sem NR', tone: 'muted' as const }, ...nrs.map(row => ({ value: String(row.code), label: `NR ${row.code}` }))]
  const nr = draft.nr
  const nrUnavailable = !loading && !editing && !!nr && !nrOptions.some(option => option.value === nr)
  const options = editing && nr && !nrOptions.some(option => option.value === nr)
    ? [...nrOptions, { value: nr, label: formatRegulatoryStandardCode(`NR ${nr}`) }]
    : nrOptions
  return <form data-track-submit={BUTTONS.comuns.continuar} className="event-create-step event-create-details" noValidate onSubmit={event => {
    event.preventDefault()
    if (loading || nrUnavailable) return
    setAttempted(true)
    const validation = validateEventInformation(draft)
    const field = validation.title ? 'title' : validation.description ? 'description' : validation.externalLink ? 'link' : null
    if (field) {
      event.currentTarget.querySelector<HTMLInputElement>(`#event-create-${field}`)?.focus()
      return
    }
    onContinue()
  }}>
    {editing && <p className="event-create-description">{detailsLocked ? 'O evento já começou. Título, descrição e link externo não podem ser alterados.' : 'Edite o título, a descrição e o link externo. A NR é definida na criação do evento.'}</p>}
    <div className="event-create-fields">
      <div className="event-create-field">
        <label htmlFor="event-create-title">Título</label>
        <input readOnly={detailsLocked} required aria-invalid={!!errors.title} aria-describedby={errors.title ? 'event-create-title-error' : undefined} id="event-create-title" minLength={3} maxLength={255} onChange={event => onChange({ title: event.target.value })} placeholder="Digite o título do evento" value={draft.title} />
        {errors.title && <p className="event-create-error" id="event-create-title-error" role="alert">{errors.title}</p>}
      </div>
      <div className="event-create-field">
        <label htmlFor="event-create-description">Descrição</label>
        <input readOnly={detailsLocked} required aria-invalid={!!errors.description} aria-describedby={errors.description ? 'event-create-description-error' : undefined} id="event-create-description" minLength={3} onChange={event => onChange({ description: event.target.value })} placeholder="Digite a descrição do evento" value={draft.description} />
        {errors.description && <p className="event-create-error" id="event-create-description-error" role="alert">{errors.description}</p>}
      </div>
      <div className="event-create-field">
        <label htmlFor="event-create-nr">NR</label>
        <ToolbarSelect trackingAction={BUTTONS.comuns.nr} escapeOverflow disabled={editing || loading} className="event-create-select" id="event-create-nr" label="NR do evento" maxVisibleRows={2.5} onValueChange={nr => onChange({ nr: nr.replace(/^NR\s*/i, '') })} options={options} value={nr} />
        {nrUnavailable && <p className="event-create-error" role="alert">Selecione uma NR destinada a colaboradores ou a opção Sem NR.</p>}
      </div>
      <div className="event-create-field">
        <label htmlFor="event-create-link">Link externo (opcional)</label>
        <input readOnly={detailsLocked} aria-invalid={!!errors.externalLink} aria-describedby={errors.externalLink ? 'event-create-link-error' : undefined} id="event-create-link" maxLength={2048} onChange={event => onChange({ externalLink: event.target.value })} placeholder="Digite ou cole o link externo" type="url" value={draft.externalLink} />
        {errors.externalLink && <p className="event-create-error" id="event-create-link-error" role="alert">{errors.externalLink}</p>}
      </div>
    </div>
    <div className="astro-modal-actions event-create-actions">
      <button data-track-action={BUTTONS.comuns.cancelar} className="astro-modal-cancel" onClick={onCancel} type="button">Cancelar</button>
      <PurpleButton disabled={loading || nrUnavailable} data-track-action={BUTTONS.comuns.continuar} type="submit">Continuar</PurpleButton>
    </div>
  </form>
}

export default EventInformationModal
