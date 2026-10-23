import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useId, useState } from 'react'
import AppModal from '../appModal'
import TruncatedText from '../truncatedText'
import EventGroupsSummary from '../eventGroupsSummary'
import EventGroupCollaboratorsModal from '../eventGroupCollaboratorsModal'
import { completionOptions, evidenceOptions } from '../../data/eventSettings'
import type { CalendarEvent } from '../../types/events'
import { configurationForEvent } from '../../utils/eventEditing'
import { formatRegulatoryStandardCode } from '../../utils/regulatoryStandardCode'
import { useEventCollaboratorPhotos } from '../../hooks/useEventCollaboratorPhotos'


interface EventDetailsModalProps {
  event: CalendarEvent
  onClose: () => void
}

function EventDetailsModal({ event, onClose }: EventDetailsModalProps) {
  const { draft, groups, assignments, schedules, settings, selectedIds, collaborators = [] } = configurationForEvent(event)
  const people = useEventCollaboratorPhotos(collaborators)
  const id = useId()
  const link = /^https?:\/\//i.test(draft.externalLink) ? draft.externalLink : undefined
  const participantIds = [...new Set(selectedIds)]
  const [collaboratorGroup, setCollaboratorGroup] = useState<{ name: string; ids: string[] } | null>(null)


  return <><AppModal trackingName={DIALOG_NAMES.informacoes_evento} className="event-create-modal event-create-modal--review event-information-modal" dimmed={Boolean(collaboratorGroup)} title="Informações do evento" onClose={onClose}>
    {dismiss => <>
      <div className="event-information-heading">
        <p>Consulte os dados e a programação de todas as turmas deste evento.</p>
      </div>
      <div className="event-create-review-grid event-information-grid">
        <section aria-labelledby={`${id}-details`} className="event-create-summary-card event-information-panel">
          <h3 id={`${id}-details`}>Informações</h3>
          <dl aria-label="Dados do evento" className="event-information-panel-scroll" tabIndex={0}>
              <div><dt>Título</dt><dd><TruncatedText>{draft.title || 'Não informado'}</TruncatedText></dd></div>
              <div><dt>Descrição</dt><dd className="event-information-description"><TruncatedText>{draft.description || 'Não informada'}</TruncatedText></dd></div>
              <div><dt>NR</dt><dd><TruncatedText>{draft.nr ? formatRegulatoryStandardCode(`NR ${draft.nr}`) : 'Não informada'}</TruncatedText></dd></div>
              {event.status && <div><dt>Status</dt><dd>{event.status === 'ATIVO' ? 'Ativo' : event.status === 'CANCELADO' ? 'Cancelado' : 'Concluído'}</dd></div>}
              <div><dt>Link externo</dt><dd>{link ? <a data-track-action={BUTTONS.comuns.abrir_link_evento} href={link} target="_blank" rel="noopener noreferrer"><TruncatedText>{draft.externalLink}</TruncatedText></a> : <TruncatedText>{draft.externalLink || 'Não informado'}</TruncatedText>}</dd></div>
            </dl>
        </section>
        <section aria-labelledby={`${id}-groups`} className="event-create-summary-card event-create-summary-card--groups event-information-panel">
          <h3 id={`${id}-groups`}>Grupos</h3>
          <EventGroupsSummary assignments={assignments} groups={groups} schedules={schedules} selectedIds={participantIds} onViewCollaborators={(group, ids) => setCollaboratorGroup({ name: group.name, ids })} />
        </section>
        <section aria-labelledby={`${id}-settings`} className="event-create-summary-card event-information-panel">
          <h3 id={`${id}-settings`}>Configurações</h3>
          <dl aria-label="Configurações do evento" className="event-information-panel-scroll" tabIndex={0}>
              <div><dt>Forma de conclusão</dt><dd><TruncatedText>{completionOptions.find(option => option.value && option.value === settings.completion)?.label || 'Não definida'}</TruncatedText></dd></div>
              <div><dt>Evidência obrigatória</dt><dd><TruncatedText>{evidenceOptions.find(option => option.value && option.value === settings.evidenceRequired)?.label || 'Não definida'}</TruncatedText></dd></div>
              <div><dt>Total de participantes</dt><dd><TruncatedText>{`${participantIds.length} colaboradores`}</TruncatedText></dd></div>
              <div><dt>Total de turmas</dt><dd><TruncatedText>{`${groups.length} ${groups.length === 1 ? 'turma' : 'turmas'}`}</TruncatedText></dd></div>
            </dl>
        </section>
      </div>
      <div className="astro-modal-actions"><button data-track-action={BUTTONS.comuns.voltar} className="astro-modal-cancel" type="button" onClick={dismiss}>Voltar</button></div>
    </>}
  </AppModal>{collaboratorGroup && <EventGroupCollaboratorsModal collaborators={people} groupName={collaboratorGroup.name} participantIds={collaboratorGroup.ids} onClose={() => setCollaboratorGroup(null)} />}</>
}

export default EventDetailsModal
