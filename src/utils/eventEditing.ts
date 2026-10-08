import type { EventConfiguration } from '../types/eventCreation'
import type { CalendarEvent, EventCategory } from '../types/events'
import { mockEventManager } from '../data/events'

export function numberEventsByDay(events: readonly CalendarEvent[]): CalendarEvent[] {
  const counters = new Map<string, number>()
  return events.map(event => {
    if (event.category === 'today') return event
    const eventNumber = (counters.get(event.date) ?? 0) + 1
    counters.set(event.date, eventNumber)
    return { ...event, eventNumber }
  })
}

export function configurationForEvent(event: CalendarEvent): EventConfiguration {
  if (event.configuration) return structuredClone(event.configuration)
  return {
    creatorId: mockEventManager.id,
    draft: { title: event.title, description: '', type: 'Evento', nr: '', externalLink: '' },
    selectedIds: [],
    groups: [{ id: 'group-1', name: 'Grupo 1' }],
    assignments: {},
    schedules: { 'group-1': { date: event.date, startTime: event.category === 'today' ? '' : event.startTime, endTime: event.category === 'today' ? '' : event.endTime } },
    settings: { completion: '', evidenceRequired: '' },
  }
}

export function startedGroupIds(value: EventConfiguration, now = Date.now()): string[] {
  return value.groups.filter(group => {
    const schedule = value.schedules[group.id]
    return schedule?.date && schedule.startTime && new Date(`${schedule.date}T${schedule.startTime}:00`).getTime() <= now
  }).map(group => group.id)
}

export function canEditEvent(value: EventConfiguration, managerId: string): boolean {
  return value.creatorId === managerId
}

export function validateEventEdit(original: EventConfiguration, value: EventConfiguration, managerId: string, now = Date.now()): string | null {
  if (!canEditEvent(original, managerId)) return 'Somente o gestor criador pode editar este evento.'
  if (value.creatorId !== original.creatorId || value.draft.nr !== original.draft.nr || value.draft.type !== original.draft.type
    || value.settings.completion !== original.settings.completion || value.settings.evidenceRequired !== original.settings.evidenceRequired) {
    return 'NR, modo de conclusão, evidência obrigatória e gestor criador não podem ser alterados.'
  }
  if (JSON.stringify(value.groups) !== JSON.stringify(original.groups)) return 'As turmas são definidas na criação do evento.'
  const lockedIds = startedGroupIds(original, now)
  if (lockedIds.length && (value.draft.title !== original.draft.title || value.draft.description !== original.draft.description || value.draft.externalLink !== original.draft.externalLink)) {
    return 'O evento já começou. Título, descrição e link externo não podem ser alterados.'
  }
  for (const groupId of lockedIds) {
    const before = original.schedules[groupId]
    const after = value.schedules[groupId]
    if (!after || before.date !== after.date || before.startTime !== after.startTime || before.endTime !== after.endTime) {
      return 'Data e horários de uma turma que já começou não podem ser alterados.'
    }
    const members = (configuration: EventConfiguration) => Object.entries(configuration.assignments)
      .filter(([personId, id]) => id === groupId && configuration.selectedIds.includes(personId)).map(([personId]) => personId).sort().join('|')
    if (members(original) !== members(value)) return 'Os participantes de uma turma que já começou não podem ser alterados.'
  }
  return null
}

export function validateEventConfiguration(value: EventConfiguration): string | null {
  if (!value.draft.title.trim()) return 'Informe o título do evento na etapa Informações do evento.'
  if (value.groups.length === 0) return 'Adicione pelo menos um grupo na etapa Organizar grupos.'
  for (const group of value.groups) {
    const schedule = value.schedules[group.id]
    if (!schedule?.date || !schedule.startTime || !schedule.endTime) return `Defina a data e os dois horários de ${group.name} na etapa Organizar grupos.`
    if (schedule.endTime <= schedule.startTime) return `O horário de término de ${group.name} deve ser posterior ao início.`
  }
  return null
}

export function calendarEntriesForEvent(value: EventConfiguration, eventId: string, category: Exclude<EventCategory, 'today'>, eventNumber?: number, inactive = false): CalendarEvent[] {
  const configuration = structuredClone(value)
  configuration.draft.title = configuration.draft.title.trim()
  return configuration.groups.map(group => ({
    id: `${eventId}:${group.id}`,
    eventId,
    configuration,
    title: configuration.draft.title,
    category,
    eventNumber,
    inactive,
    ...configuration.schedules[group.id],
  }))
}
