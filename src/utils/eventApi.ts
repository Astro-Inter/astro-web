import type { EventCollaborator, EventConfiguration, EventGroupSchedule } from '../types/eventCreation'
import type { CalendarEvent, CalendarView, CreateEventRequest, EventCalendarResponse, EventCandidateResponse, EventResponse, UpdateEventRequest } from '../types/events'
import { calendarDays, weekDays } from './events'
import { validateEventInformation } from './eventInformationValidation'

export function eventCalendarRange(date: Date, view: CalendarView): { startDate: string; endDate: string } {
  const days = view === 'week' ? weekDays(date) : calendarDays(date)
  const year = date.getFullYear()
  return {
    startDate: `${view === 'year' ? `${year}-01-01` : days[0].date}T00:00:00`,
    endDate: `${view === 'year' ? `${year}-12-31` : days[days.length - 1].date}T23:59:59`,
  }
}

export function candidateForEvent(person: EventCandidateResponse): EventCollaborator {
  return { id: String(person.id), name: person.name, email: person.email ?? 'Não informado', unit: person.unitName ?? 'Não informado',
    position: person.roleName ?? 'Não informado', modality: person.workModel === 'PRESENCIAL' ? 'Presencial' : person.workModel === 'REMOTO' ? 'Remoto' : person.workModel === 'HIBRIDO' ? 'Híbrido' : 'Não informado' }
}

export function eventConfiguration(data: EventResponse): EventConfiguration {
  const people = data.eventClasses.flatMap(group => group.participants)
  return {
    creatorId: String(data.managerId),
    permissions: { canEdit: data.canEdit, canCancel: data.canCancel, detailsEditable: data.detailsEditable, lockedGroupIds: data.eventClasses.filter(group => !group.editable).map(group => String(group.id)) },
    draft: { title: data.title, description: data.description, nr: data.nrId === null ? '' : String(data.nrId), externalLink: data.externalLink ?? '', type: 'Evento' },
    selectedIds: people.map(person => String(person.id)),
    collaborators: people.map(person => ({ id: String(person.id), name: person.name, email: person.email ?? 'Não informado', unit: 'Não informado', position: 'Não informado', modality: 'Não informado' })),
    groups: data.eventClasses.map(group => ({ id: String(group.id), name: group.name })),
    assignments: Object.fromEntries(data.eventClasses.flatMap(group => group.participants.map(person => [String(person.id), String(group.id)]))),
    schedules: Object.fromEntries(data.eventClasses.map(group => [String(group.id), { date: group.startDate.slice(0, 10), endDate: group.endDate.slice(0, 10), startTime: group.startDate.slice(11, 16), endTime: group.endDate.slice(11, 16), originalStart: group.startDate, originalEnd: group.endDate }])),
    settings: { completion: data.completionMode === 'COLABORADOR' ? 'collaborator' : 'manager', evidenceRequired: data.mandatoryEvidence ? 'required' : 'optional' },
  }
}

// Uma turma pode atravessar dias e as bordas do período exibido.
export function calendarFromApi(rows: readonly EventCalendarResponse[], startDate: string, endDate: string): CalendarEvent[] {
  return rows.flatMap(row => {
    const start = row.startDate.slice(0, 10) < startDate.slice(0, 10) ? startDate.slice(0, 10) : row.startDate.slice(0, 10)
    const end = row.endDate.slice(0, 10) > endDate.slice(0, 10) ? endDate.slice(0, 10) : row.endDate.slice(0, 10)
    const entries: CalendarEvent[] = []
    const day = new Date(`${start}T12:00:00`)
    while (localDate(day) <= end) {
      const date = localDate(day)
      entries.push({ id: `${row.eventId}:${row.eventClassId}:${date}`, eventId: String(row.eventId), title: row.eventTitle, category: 'event', date,
        startTime: date === row.startDate.slice(0, 10) ? row.startDate.slice(11, 16) : '00:00', endTime: date === row.endDate.slice(0, 10) ? row.endDate.slice(11, 16) : '23:59', inactive: row.status === 'CANCELADO', status: row.status })
      day.setDate(day.getDate() + 1)
    }
    return entries
  })
}
function localDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

function scheduleDates(schedule: EventGroupSchedule): { startDate: string; endDate: string } {
  const start = `${schedule.date}T${schedule.startTime}`
  const end = `${schedule.endDate || schedule.date}T${schedule.endTime}`
  return { startDate: schedule.originalStart?.slice(0, 16) === start ? schedule.originalStart : `${start}:00`, endDate: schedule.originalEnd?.slice(0, 16) === end ? schedule.originalEnd : `${end}:00` }
}

export function validateEventForApi(value: EventConfiguration): string | null {
  const informationError = Object.values(validateEventInformation(value.draft))[0]
  if (informationError) return informationError
  if (value.draft.nr && (!/^[1-9]\d*$/.test(value.draft.nr) || !Number.isSafeInteger(Number(value.draft.nr)))) return 'Selecione uma NR do catálogo.'
  if (!['collaborator', 'manager'].includes(value.settings.completion)) return 'Selecione a forma de conclusão do evento.'
  if (!['required', 'optional'].includes(value.settings.evidenceRequired)) return 'Selecione se a evidência é obrigatória.'
  if (!value.groups.length) return 'Adicione pelo menos uma turma.'
  const names = new Set<string>()
  for (const group of value.groups) {
    if (!group.name.trim() || group.name.trim().length > 255 || names.has(group.name.trim())) return 'As turmas devem ter nomes únicos de até 255 caracteres.'
    names.add(group.name.trim())
    const schedule = value.schedules[group.id]
    if (!schedule?.date || !schedule.startTime || !schedule.endTime) return `Defina a data e os horários de ${group.name}.`
    const { startDate, endDate } = scheduleDates(schedule)
    if (!Number.isFinite(new Date(startDate).getTime()) || !Number.isFinite(new Date(endDate).getTime()) || endDate <= startDate) return `O término de ${group.name} deve ser posterior ao início.`
    if (!value.selectedIds.some(id => value.assignments[id] === group.id)) return `Adicione pelo menos um participante a ${group.name}.`
  }
  if (new Set(value.groups.map(group => group.id)).size !== value.groups.length || new Set(value.selectedIds).size !== value.selectedIds.length) return 'Existem turmas ou participantes duplicados.'
  if (value.selectedIds.some(id => !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)) || !value.groups.some(group => group.id === value.assignments[id]))) return 'Distribua todos os participantes selecionados nas turmas.'
  return null
}

export function eventRequest(value: EventConfiguration, editing: boolean): CreateEventRequest | UpdateEventRequest {
  const error = validateEventForApi(value)
  if (error) throw new Error(error)
  const common: UpdateEventRequest = {
    title: value.draft.title, description: editing ? value.draft.description : value.draft.description.trim(), externalLink: value.draft.externalLink || null,
    eventClasses: value.groups.map(group => ({ ...(editing && /^[1-9]\d*$/.test(group.id) ? { id: Number(group.id) } : {}), name: group.name,
      ...scheduleDates(value.schedules[group.id]), participantIds: value.selectedIds.filter(id => value.assignments[id] === group.id).map(Number) })),
  }
  return editing ? common : { ...common, title: common.title.trim(), externalLink: common.externalLink?.trim() || null, nrId: value.draft.nr ? Number(value.draft.nr) : null,
    completionMode: value.settings.completion === 'collaborator' ? 'COLABORADOR' : 'GESTOR', mandatoryEvidence: value.settings.evidenceRequired === 'required' }
}
