import { BUTTONS } from '../../gtm/buttons'
import type { EventGroup, EventGroupSchedule } from '../../types/eventCreation'
import TruncatedText from '../truncatedText'

interface EventGroupsSummaryProps {
  groups: readonly EventGroup[]
  assignments: Readonly<Record<string, string>>
  schedules: Readonly<Record<string, EventGroupSchedule>>
  selectedIds?: readonly string[]
  onViewCollaborators?: (group: EventGroup, ids: string[]) => void

}

function EventGroupsSummary({ groups, assignments, schedules, selectedIds = Object.keys(assignments), onViewCollaborators }: EventGroupsSummaryProps) {
  const participantIds = [...new Set(selectedIds)]
  const unassigned = participantIds.filter(id => !groups.some(group => group.id === assignments[id]))

  return <dl aria-label="Programação dos grupos" tabIndex={0}>{groups.map(group => {
    const schedule = schedules[group.id]
    const date = schedule?.date ? schedule.date.split('-').reverse().join('/') : 'Data não definida'
    const members = participantIds.filter(id => assignments[id] === group.id)
    return <div key={group.id}>
      <dt><TruncatedText>{group.name}</TruncatedText></dt>
      <dd>
        <TruncatedText>{`${date} · ${schedule?.startTime || '—'} – ${schedule?.endTime || '—'}`}</TruncatedText>
        {onViewCollaborators ? <button data-track-action={BUTTONS.comuns.ver_colaboradores} aria-label={`Ver ${members.length} colaboradores de ${group.name}`} className="event-group-collaborators-link" onClick={() => onViewCollaborators(group, members)} type="button">{members.length} colaboradores</button> : <span>{members.length} participantes</span>}

      </dd>
    </div>
  })}{unassigned.length > 0 && <div><dt>Sem grupo</dt><dd>{onViewCollaborators ? <button data-track-action={BUTTONS.comuns.ver_colaboradores} className="event-group-collaborators-link" onClick={() => onViewCollaborators({ id: 'unassigned', name: 'Sem grupo' }, unassigned)} type="button">{unassigned.length} colaboradores</button> : <span>{unassigned.length} participantes</span>}</dd></div>}</dl>
}

export default EventGroupsSummary
