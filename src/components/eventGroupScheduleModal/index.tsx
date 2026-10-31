import AnimatedFieldError from '../animatedFieldError'
import { BUTTONS } from '../../gtm/buttons'
import { useState } from 'react'
import { validateEventSchedule } from '../../utils/eventStepValidation'
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
  lockedGroupIds?: readonly string[]
}

function EventGroupScheduleModal({ groups, assignments, schedules, onChange, onBack, onContinue, lockedGroupIds = [] }: EventGroupScheduleModalProps) {
  const [attempted, setAttempted] = useState(false)
  const [fields, setFields] = useState<Record<string, { touched: string[]; invalidDates: string[] }>>({})
  function update(groupId: string, changes: Partial<EventGroupSchedule>) {
    setFields(current => ({ ...current, [groupId]: { invalidDates: current[groupId]?.invalidDates ?? [], touched: [...new Set([...(current[groupId]?.touched ?? []), ...Object.keys(changes)])] } }))
    onChange(groupId, changes)
  }
  function dateValidity(groupId: string, field: 'date' | 'endDate', valid: boolean) {
    setFields(current => ({ ...current, [groupId]: { touched: current[groupId]?.touched ?? [], invalidDates: [...(current[groupId]?.invalidDates ?? []).filter(key => key !== field), ...(!valid ? [field] : [])] } }))
  }
  function errorsFor(groupId: string) {
    return { ...validateEventSchedule(schedules[groupId]), ...Object.fromEntries((fields[groupId]?.invalidDates ?? []).map(field => [field, 'Informe uma data válida no formato dd/mm/aaaa.'])) }
  }
  return <form noValidate data-track-submit={BUTTONS.comuns.continuar} onSubmit={event => {
    event.preventDefault()
    setAttempted(true)
    for (const group of groups) {
      if (lockedGroupIds.includes(group.id)) continue
      const validation = errorsFor(group.id)
      const field = validation.date ? 'date' : validation.endDate ? 'end-date' : validation.startTime ? 'start' : validation.endTime ? 'end' : null
      if (field) {
        const id = `event-${field}-${group.id}`
        const input = [...event.currentTarget.querySelectorAll<HTMLInputElement>('input')].find(input => input.id === id)
        input?.focus()
        return
      }
    }
    onContinue()
  }}>
    <p className="event-create-description">Defina a data e os horários de cada grupo.</p>
    <div className="event-create-schedule-grid">
      {groups.map(group => {
        const schedule = schedules[group.id] ?? { date: '', startTime: '', endTime: '' }
        const participants = Object.values(assignments).filter(id => id === group.id).length
        const validation = lockedGroupIds.includes(group.id) ? {} : errorsFor(group.id)
        const errors = Object.fromEntries(Object.entries(validation).filter(([field]) => attempted || fields[group.id]?.touched.includes(field) || Boolean(schedule[field as keyof EventGroupSchedule])))
        return <section className="event-create-summary-card" key={group.id}>
          <h3>{group.name}<span>{participants} {participants === 1 ? 'participante' : 'participantes'}</span></h3>
          {lockedGroupIds.includes(group.id) && <p className="event-create-lock-note">Turma iniciada: data, horários e participantes não podem ser alterados.</p>}
          <fieldset className="event-create-fields event-create-schedule-fields" disabled={lockedGroupIds.includes(group.id)}>
            <legend className="sr-only">Data e horários de {group.name}</legend>
            <div className="event-create-field"><label htmlFor={`event-date-${group.id}`} id={`event-date-${group.id}-label`}>Data de início</label><FormDatePicker animateError error={errors.date} escapeOverflow id={`event-date-${group.id}`} labelledBy={`event-date-${group.id}-label`} label={`Data de início de ${group.name}`} onValidityChange={valid => dateValidity(group.id, 'date', valid)} onChange={date => update(group.id, { date, ...(!schedule.endDate || schedule.endDate === schedule.date ? { endDate: date } : {}) })} value={schedule.date} /></div>
            <div className="event-create-field"><label htmlFor={`event-end-date-${group.id}`} id={`event-end-date-${group.id}-label`}>Data de término</label><FormDatePicker animateError error={errors.endDate} escapeOverflow id={`event-end-date-${group.id}`} labelledBy={`event-end-date-${group.id}-label`} label={`Data de término de ${group.name}`} onValidityChange={valid => dateValidity(group.id, 'endDate', valid)} onChange={endDate => update(group.id, { endDate })} value={schedule.endDate || schedule.date} /></div>
            <div className="event-create-field"><label htmlFor={`event-start-${group.id}`}>Horário de início</label><EventTimePicker error={errors.startTime} id={`event-start-${group.id}`} label={`Horário de início de ${group.name}`} onChange={startTime => update(group.id, { startTime })} value={schedule.startTime} /><AnimatedFieldError className="login-field-error" id={`event-start-${group.id}-error`} message={errors.startTime} /></div>
            <div className="event-create-field"><label htmlFor={`event-end-${group.id}`}>Horário de término</label><EventTimePicker error={errors.endTime} id={`event-end-${group.id}`} label={`Horário de término de ${group.name}`} onChange={endTime => update(group.id, { endTime })} value={schedule.endTime} /><AnimatedFieldError className="login-field-error" id={`event-end-${group.id}-error`} message={errors.endTime} /></div>
          </fieldset>
        </section>
      })}
    </div>
    <div className="astro-modal-actions event-create-actions"><button data-track-action={BUTTONS.comuns.voltar} className="astro-modal-cancel" onClick={onBack} type="button">Voltar</button><PurpleButton data-track-action={BUTTONS.comuns.continuar} type="submit">Continuar</PurpleButton></div>
  </form>
}

export default EventGroupScheduleModal
