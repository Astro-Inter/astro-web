import { defaultNrsRows } from '../../data/regulatoryStandards'
import type { EventDraft } from '../../types/eventCreation'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface EventInformationModalProps {
  draft: EventDraft
  onCancel: () => void
  onChange: (changes: Partial<EventDraft>) => void
  onContinue: () => void
}

const nrOptions = [
  { value: '', label: 'Selecione a NR do evento', tone: 'muted' as const },
  ...defaultNrsRows.map(({ code }) => ({ value: code, label: code })),
]

function EventInformationModal({ draft, onCancel, onChange, onContinue }: EventInformationModalProps) {
  return <form className="event-create-step event-create-details" noValidate onSubmit={event => { event.preventDefault(); onContinue() }}>
    <div className="event-create-fields">
      <label className="event-create-field" htmlFor="event-create-title">
        <span>Título</span>
        <input id="event-create-title" maxLength={120} onChange={event => onChange({ title: event.target.value })} placeholder="Digite o título do evento" value={draft.title} />
      </label>
      <label className="event-create-field" htmlFor="event-create-description">
        <span>Descrição</span>
        <input id="event-create-description" maxLength={300} onChange={event => onChange({ description: event.target.value })} placeholder="Digite a descrição do evento" value={draft.description} />
      </label>
      <label className="event-create-field" htmlFor="event-create-type">
        <span>Tipo do evento</span>
        <input id="event-create-type" maxLength={80} onChange={event => onChange({ type: event.target.value })} placeholder="Digite o tipo do evento" value={draft.type} />
      </label>
      <div className="event-create-field">
        <label htmlFor="event-create-nr">NR</label>
        <ToolbarSelect className="event-create-select" id="event-create-nr" label="NR do evento" maxVisibleRows={2.5} onValueChange={nr => onChange({ nr })} options={nrOptions} value={draft.nr} />
      </div>
      <label className="event-create-field" htmlFor="event-create-link">
        <span>Link externo (opcional)</span>
        <input id="event-create-link" maxLength={300} onChange={event => onChange({ externalLink: event.target.value })} placeholder="Digite ou cole o link externo" type="url" value={draft.externalLink} />
      </label>
    </div>
    <div className="astro-modal-actions event-create-actions">
      <button className="astro-modal-cancel" onClick={onCancel} type="button">Cancelar</button>
      <PurpleButton type="submit">Continuar</PurpleButton>
    </div>
  </form>
}

export default EventInformationModal
