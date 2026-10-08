import { defaultNrsRows } from '../../data/regulatoryStandards'
import type { EventDraft } from '../../types/eventCreation'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface EventInformationModalProps {
  draft: EventDraft
  onCancel: () => void
  onChange: (changes: Partial<EventDraft>) => void
  onContinue: () => void
  editing?: boolean
  detailsLocked?: boolean
}

const nrOptions = [
  { value: '', label: 'Selecione a NR do evento', tone: 'muted' as const },
  ...defaultNrsRows.map(({ code }) => ({ value: code, label: code })),
]

function EventInformationModal({ draft, onCancel, onChange, onContinue, editing = false, detailsLocked = false }: EventInformationModalProps) {
  return <form className="event-create-step event-create-details" noValidate onSubmit={event => { event.preventDefault(); onContinue() }}>
    {editing && <p className="event-create-description">{detailsLocked ? 'O evento já começou. Título, descrição e link externo não podem ser alterados.' : 'Edite o título, a descrição e o link externo. A NR é definida na criação do evento.'}</p>}
    <div className="event-create-fields">
      <label className="event-create-field" htmlFor="event-create-title">
        <span>Título</span>
        <input readOnly={detailsLocked} id="event-create-title" maxLength={120} onChange={event => onChange({ title: event.target.value })} placeholder="Digite o título do evento" value={draft.title} />
      </label>
      <label className="event-create-field" htmlFor="event-create-description">
        <span>Descrição</span>
        <input readOnly={detailsLocked} id="event-create-description" maxLength={300} onChange={event => onChange({ description: event.target.value })} placeholder="Digite a descrição do evento" value={draft.description} />
      </label>
      <div className="event-create-field">
        <label htmlFor="event-create-nr">NR</label>
        <ToolbarSelect disabled={editing} className="event-create-select" id="event-create-nr" label="NR do evento" maxVisibleRows={2.5} onValueChange={nr => onChange({ nr })} options={nrOptions} value={draft.nr} />
      </div>
      <label className="event-create-field" htmlFor="event-create-link">
        <span>Link externo (opcional)</span>
        <input readOnly={detailsLocked} id="event-create-link" maxLength={300} onChange={event => onChange({ externalLink: event.target.value })} placeholder="Digite ou cole o link externo" type="url" value={draft.externalLink} />
      </label>
    </div>
    <div className="astro-modal-actions event-create-actions">
      <button className="astro-modal-cancel" onClick={onCancel} type="button">Cancelar</button>
      <PurpleButton type="submit">Continuar</PurpleButton>
    </div>
  </form>
}

export default EventInformationModal
