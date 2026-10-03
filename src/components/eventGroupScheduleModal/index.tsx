import type { EventGroup, EventGroupSchedule } from '../../types/eventCreation'
import FormDatePicker from '../formDatePicker'
import EventTimePicker from '../eventTimePicker'
import PurpleButton from '../purpleButton'

interface EventGroupScheduleModalProps {
  groups: readonly EventGroup[]
  assignments: Readonly<Record<string, string>>
  schedules: Readonly<Record<string, EventGroupSchedule>>
  onChange: (groupId: string, changes: Partial<EventGroupSchedule>) => void
  onBack: () => void
  onContinue: () => void
}

function EventGroupScheduleModal({ groups, assignments, schedules, onChange, onBack, onContinue }: EventGroupScheduleModalProps) {
  return <form onSubmit={event => { event.preventDefault(); onContinue() }}>
    <p className="event-create-description">Defina a data e os horários de cada grupo.</p>
    <div className="event-create-schedule-grid">
      {groups.map(group => {
        const schedule = schedules[group.id] ?? { date: '', startTime: '', endTime: '' }
        const participants = Object.values(assignments).filter(id => id === group.id).length
        return <section className="event-create-summary-card" key={group.id}>
          <h3>{group.name}<span>{participants} {participants === 1 ? 'participante' : 'participantes'}</span></h3>
          <div className="event-create-fields">
            <div className="event-create-field"><label htmlFor={`event-date-${group.id}`}>Data</label><FormDatePicker id={`event-date-${group.id}`} label={`Data de ${group.name}`} onChange={date => onChange(group.id, { date })} value={schedule.date} /></div>
            <div className="event-create-field"><label htmlFor={`event-start-${group.id}`}>Horário de início</label><EventTimePicker id={`event-start-${group.id}`} label={`Horário de início de ${group.name}`} onChange={startTime => onChange(group.id, { startTime })} value={schedule.startTime} /></div>
            <div className="event-create-field"><label htmlFor={`event-end-${group.id}`}>Horário de término</label><EventTimePicker id={`event-end-${group.id}`} label={`Horário de término de ${group.name}`} onChange={endTime => onChange(group.id, { endTime })} value={schedule.endTime} /></div>
          </div>
        </section>
      })}
    </div>
    <div className="astro-modal-actions event-create-actions"><button className="astro-modal-cancel" onClick={onBack} type="button">Voltar</button><PurpleButton type="submit">Continuar</PurpleButton></div>
  </form>
}

export default EventGroupScheduleModal
