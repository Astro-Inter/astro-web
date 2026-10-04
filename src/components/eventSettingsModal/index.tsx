import { completionOptions, evidenceOptions } from '../../data/eventSettings'
import type { EventSettings } from '../../types/eventCreation'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface EventSettingsModalProps {
  settings: EventSettings
  onChange: (changes: Partial<EventSettings>) => void
  onBack: () => void
  onContinue: () => void
}

function EventSettingsModal({ settings, onChange, onBack, onContinue }: EventSettingsModalProps) {
  return <form onSubmit={event => { event.preventDefault(); onContinue() }}>
    <div className="event-create-fields">
      <div className="event-create-field"><label htmlFor="event-completion">Forma de conclusão</label><ToolbarSelect className="event-create-select" id="event-completion" label="Forma de conclusão" maxVisibleRows={3} onValueChange={completion => onChange({ completion })} options={completionOptions} preferredPlacement="below" searchable={false} value={settings.completion} /></div>
      <div className="event-create-field"><label htmlFor="event-evidence">Evidência obrigatória</label><ToolbarSelect className="event-create-select" id="event-evidence" label="Evidência obrigatória" maxVisibleRows={3} onValueChange={evidenceRequired => onChange({ evidenceRequired })} options={evidenceOptions} preferredPlacement="below" searchable={false} value={settings.evidenceRequired} /></div>
    </div>
    <div className="astro-modal-actions event-create-actions"><button className="astro-modal-cancel" onClick={onBack} type="button">Voltar</button><PurpleButton type="submit">Continuar</PurpleButton></div>
  </form>
}

export default EventSettingsModal
