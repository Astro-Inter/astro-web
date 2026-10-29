import { useExitPresence } from '../../hooks/useExitPresence'
import AnimatedFieldError from '../animatedFieldError'
import { useState } from 'react'
import { BUTTONS } from '../../gtm/buttons'
import type { EventDraft } from '../../types/eventCreation'
import type { EventNrOption } from '../../types/events'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'
import ApiContentSkeleton from '../apiContentSkeleton'
import { formatRegulatoryStandardCode } from '../../utils/regulatoryStandardCode'
import { validateEventInformation, type EventInformationErrors } from '../../utils/eventInformationValidation'

interface EventInformationModalProps {
  draft: EventDraft
  onCancel: () => void
  onChange: (changes: Partial<EventDraft>) => void
  onContinue: () => void
  editing?: boolean
  detailsLocked?: boolean
  nrs: readonly EventNrOption[]
  loading?: boolean
  unavailable?: boolean
}

function EventInformationModal({ draft, onCancel, onChange, onContinue, nrs, loading: requestedLoading = false, unavailable = false, editing = false, detailsLocked = false }: EventInformationModalProps) {
  const presence = useExitPresence(true, requestedLoading)
  const loading = presence.present
  const [errors, setErrors] = useState<EventInformationErrors>({})
  function update(changes: Partial<EventDraft>, field: keyof EventInformationErrors) {
    setErrors(current => ({ ...current, [field]: undefined }))
    onChange(changes)
  }
  const nrOptions = [{ value: '', label: 'Sem NR', tone: 'muted' as const }, ...nrs.map(row => ({ value: String(row.code), label: `NR ${row.code}` }))]
  const nr = draft.nr
  const nrUnavailable = !loading && !unavailable && !editing && !!nr && !nrOptions.some(option => option.value === nr)
  const options = editing && nr && !nrOptions.some(option => option.value === nr)
    ? [...nrOptions, { value: nr, label: formatRegulatoryStandardCode(`NR ${nr}`) }]
    : nrOptions
  return <form data-track-submit={BUTTONS.comuns.continuar} className="event-create-step event-create-details" noValidate onSubmit={event => {
    event.preventDefault()
    if (loading || unavailable || nrUnavailable) return
    const validation = validateEventInformation(draft)
    setErrors(validation)
    const field = validation.title ? 'title' : validation.description ? 'description' : validation.externalLink ? 'link' : null
    if (field) {
      event.currentTarget.querySelector<HTMLInputElement>(`#event-create-${field}`)?.focus()
      return
    }
    onContinue()
  }}>
    {editing && detailsLocked && <p className="event-create-description">O evento já começou. Título, descrição e link externo não podem ser alterados.</p>}
    {loading && <ApiContentSkeleton className={`event-create-fields-skeleton${presence.exiting ? ' event-loading-exit' : ''}`} label="Carregando informações do evento..." fields={4} columns={1} actions={0} />}
    <div hidden={loading} className="event-create-fields event-loading-ready">
      <div className="event-create-field">
        <label htmlFor="event-create-title">Título</label>
        <input readOnly={detailsLocked} required aria-invalid={!!errors.title} aria-describedby={errors.title ? 'event-create-title-error' : undefined} id="event-create-title" minLength={3} maxLength={255} onChange={event => update({ title: event.target.value }, 'title')} placeholder="Digite o título do evento" value={draft.title} />
        <AnimatedFieldError id="event-create-title-error" message={errors.title} />
      </div>
      <div className="event-create-field">
        <label htmlFor="event-create-description">Descrição</label>
        <input readOnly={detailsLocked} required aria-invalid={!!errors.description} aria-describedby={errors.description ? 'event-create-description-error' : undefined} id="event-create-description" minLength={3} onChange={event => update({ description: event.target.value }, 'description')} placeholder="Digite a descrição do evento" value={draft.description} />
        <AnimatedFieldError id="event-create-description-error" message={errors.description} />
      </div>
      <div className="event-create-field">
        <label htmlFor="event-create-nr">NR (opcional)</label>
        <ToolbarSelect trackingAction={BUTTONS.comuns.nr} escapeOverflow disabled={loading || editing || unavailable} error={nrUnavailable ? 'Selecione uma NR destinada a colaboradores ou a opção Sem NR.' : undefined} className="event-create-select" id="event-create-nr" label="NR do evento" maxVisibleRows={2.5} onValueChange={nr => onChange({ nr: nr.replace(/^NR\s*/i, '') })} options={options} value={nr} />
        <AnimatedFieldError id="event-create-nr-error" message={nrUnavailable ? 'Selecione uma NR destinada a colaboradores ou a opção Sem NR.' : undefined} />
      </div>
      <div className="event-create-field">
        <label htmlFor="event-create-link">Link externo (opcional)</label>
        <input readOnly={detailsLocked} aria-invalid={!!errors.externalLink} aria-describedby={errors.externalLink ? 'event-create-link-error' : undefined} id="event-create-link" maxLength={2048} onChange={event => update({ externalLink: event.target.value }, 'externalLink')} placeholder="Digite ou cole o link externo" type="url" value={draft.externalLink} />
        <AnimatedFieldError id="event-create-link-error" message={errors.externalLink} />
      </div>
    </div>
    <div className="astro-modal-actions event-create-actions">
      <button data-track-action={BUTTONS.comuns.cancelar} className="astro-modal-cancel" onClick={onCancel} type="button">Cancelar</button>
      <PurpleButton disabled={loading || unavailable || nrUnavailable} data-track-action={BUTTONS.comuns.continuar} type="submit">Continuar</PurpleButton>
    </div>
  </form>
}

export default EventInformationModal
