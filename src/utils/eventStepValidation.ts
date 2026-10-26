import type { EventGroup, EventGroupSchedule, EventSettings } from '../types/eventCreation'

export function validateEventParticipants(selectedIds: readonly string[], eligibleIds: readonly string[]): string | undefined {
  return eligibleIds.some(id => selectedIds.includes(id)) ? undefined : 'Selecione pelo menos um colaborador para continuar.'
}

export function validateEventGroups(groups: readonly EventGroup[], assignments: Readonly<Record<string, string>>, participantIds: readonly string[]) {
  const groupIds = new Set(groups.map(group => group.id))
  const emptyGroups: Record<string, string> = {}
  for (const group of groups) {
    if (!participantIds.some(id => assignments[id] === group.id)) emptyGroups[group.id] = 'Adicione pelo menos um colaborador a este grupo.'
  }
  return {
    groups: groups.length ? undefined : 'Adicione pelo menos um grupo para continuar.',
    assignments: participantIds.some(id => !groupIds.has(assignments[id])) ? 'Distribua todos os colaboradores nos grupos para continuar.' : undefined,
    emptyGroups,
  }
}

export function validateEventSettings(settings: EventSettings): Partial<Record<keyof EventSettings, string>> {
  const errors: Partial<Record<keyof EventSettings, string>> = {}
  if (!['collaborator', 'manager'].includes(settings.completion)) errors.completion = 'Selecione a forma de conclusão do evento.'
  if (!['required', 'optional'].includes(settings.evidenceRequired)) errors.evidenceRequired = 'Selecione se a evidência é obrigatória.'
  return errors
}

export function validateEventSchedule(schedule?: EventGroupSchedule): Partial<Record<'date' | 'endDate' | 'startTime' | 'endTime', string>> {
  const errors: Partial<Record<'date' | 'endDate' | 'startTime' | 'endTime', string>> = {}
  const validDate = (value = '') => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T12:00:00`)) && new Date(`${value}T12:00:00`).getDate() === Number(value.slice(-2))
  if (!validDate(schedule?.date)) errors.date = 'Informe uma data de início válida.'
  const endDate = schedule?.endDate || schedule?.date
  if (!validDate(endDate)) errors.endDate = 'Informe uma data de término válida.'
  else if (schedule?.date && endDate && endDate < schedule.date) errors.endDate = 'A data de término deve ser igual ou posterior à data de início.'
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule?.startTime ?? '')) errors.startTime = 'Selecione um horário de início válido.'
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule?.endTime ?? '')) errors.endTime = 'Selecione um horário de término válido.'
  else if (schedule && !errors.date && !errors.endDate && !errors.startTime) {
    const start = `${schedule.date}T${schedule.startTime}`
    const end = `${endDate}T${schedule.endTime}`
    const startDate = schedule.originalStart?.slice(0, 16) === start ? schedule.originalStart : `${start}:00`
    const finishDate = schedule.originalEnd?.slice(0, 16) === end ? schedule.originalEnd : `${end}:00`
    if (new Date(finishDate).getTime() <= new Date(startDate).getTime()) errors.endTime = 'O horário de término deve ser posterior ao horário de início.'
  }
  return errors
}
