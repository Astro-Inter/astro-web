import type { EventConfiguration } from '../types/eventCreation'
import type { CalendarEvent, EventCategory } from '../types/events'

export function configurationForEvent(event: CalendarEvent): EventConfiguration {
  if (event.configuration) return structuredClone(event.configuration)
  return {
    draft: { title: event.title, description: '', type: event.category === 'reminder' ? 'Lembrete' : 'Compromisso', nr: '', externalLink: '' },
    selectedIds: [],
    groups: [{ id: 'group-1', name: 'Grupo 1' }],
    assignments: {},
    schedules: { 'group-1': { date: event.date, startTime: event.category === 'today' ? '' : event.startTime, endTime: event.category === 'today' ? '' : event.endTime } },
    settings: { completion: '', evidenceRequired: '' },
  }
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

export function calendarEntriesForEvent(value: EventConfiguration, eventId: string, category: Exclude<EventCategory, 'today'>): CalendarEvent[] {
  const configuration = structuredClone(value)
  configuration.draft.title = configuration.draft.title.trim()
  return configuration.groups.map(group => ({
    id: `${eventId}:${group.id}`,
    eventId,
    configuration,
    title: configuration.draft.title,
    category,
    ...configuration.schedules[group.id],
  }))
}
