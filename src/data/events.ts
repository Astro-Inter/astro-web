import type { CalendarEvent, EventCategory } from '../types/events'
import type { EventConfiguration } from '../types/eventCreation'
import { mockEventCollaborators } from './eventCreation'

export const eventCategoryLabels: Record<EventCategory, string> = {
  today: 'Dia atual',
  event: 'Evento',
}

// Identidade temporária enquanto o fluxo de eventos utiliza dados mockados.
export const mockEventManager = { id: 'manager-current', name: 'Gestor criador' }

const today = new Date()
const currentYear = today.getFullYear()
const pad = (value: number) => String(value).padStart(2, '0')
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const dateInYear = (month: number, day: number) => dateKey(new Date(currentYear, month, day))
const todayDate = dateKey(today)

const sampleTitles = [
  'Reunião de equipe',
  'Revisar atividades',
  'Alinhamento do projeto',
  'Conferir entregas',
]
const sampleTimes = [
  ['08:00', '09:00'],
  ['09:00', '10:30'],
  ['11:00', '12:00'],
  ['14:00', '15:30'],
]

function groupedEvents(date: string, group: string, count: number): CalendarEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${group}-${index + 1}`,
    date,
    startTime: sampleTimes[index][0],
    endTime: sampleTimes[index][1],
    title: sampleTitles[index],
    category: 'event' as const,
  }))
}

const monthlyEvents = Array.from({ length: 12 }, (_, month): CalendarEvent[] => [
  { id: `monthly-${month}-1`, date: dateInYear(month, 7), startTime: '10:00', endTime: '11:00', title: 'Acompanhamento mensal', category: 'event' },
  { id: `monthly-${month}-2`, date: dateInYear(month, 21), startTime: '15:00', endTime: '16:00', title: 'Preparar próximos passos', category: 'event' },
]).flat()

const currentMonthGroups = [
  { day: 5, count: 2 },
  { day: 12, count: 3 },
  { day: 19, count: 4 },
].flatMap(({ day, count }) => groupedEvents(dateInYear(today.getMonth(), day), `current-month-${day}`, count))

const nearbyGroups = [
  { offset: -1, count: 2 },
  { offset: 0, count: 3 },
  { offset: 1, count: 4 },
].flatMap(({ offset, count }) => {
  const date = new Date(currentYear, today.getMonth(), today.getDate() + offset)
  return date.getFullYear() === currentYear ? groupedEvents(dateKey(date), `nearby-${offset}`, count) : []
})

const trainingConfiguration: EventConfiguration = {
  creatorId: mockEventManager.id,
  draft: {
    title: 'Treinamento de segurança — NR 35',
    description: 'Capacitação sobre trabalho em altura: análise de riscos, inspeção de equipamentos, uso de cinto e talabarte, proteção coletiva e procedimentos de emergência. Inclui atividades práticas e registro de evidência. As turmas têm datas e horários próprios; confira sua programação antes de participar.',
    type: 'Evento',
    nr: 'NR 35',
    externalLink: 'https://www.gov.br/trabalho-e-emprego',
  },
  selectedIds: mockEventCollaborators.map(person => person.id),
  groups: [
    { id: 'training-morning', name: 'Grupo 1' },
    { id: 'training-afternoon', name: 'Grupo 2' },
    { id: 'training-next-day', name: 'Grupo 3' },
    { id: 'training-final-day', name: 'Grupo 4' },
  ],
  assignments: {
    kirk: 'training-morning', pedro: 'training-morning', luana: 'training-morning', antonio: 'training-morning', maria: 'training-morning', ana: 'training-morning',
    rafael: 'training-afternoon', camila: 'training-afternoon',
    bruno: 'training-next-day', juliana: 'training-next-day',
    felipe: 'training-final-day', beatriz: 'training-final-day',
  },
  schedules: {
    'training-morning': { date: dateInYear(9, 11), startTime: '08:00', endTime: '11:00' },
    'training-afternoon': { date: dateInYear(9, 11), startTime: '14:00', endTime: '17:00' },
    'training-next-day': { date: dateInYear(9, 13), startTime: '09:00', endTime: '12:00' },
    'training-final-day': { date: dateInYear(9, 15), startTime: '13:00', endTime: '16:00' },
  },
  settings: { completion: 'manager', evidenceRequired: 'required' },
}

const trainingEvents: CalendarEvent[] = trainingConfiguration.groups.map(group => ({
  id: `mock-training:${group.id}`,
  eventId: 'mock-training',
  category: 'event',
  title: trainingConfiguration.draft.title,
  configuration: trainingConfiguration,
  ...trainingConfiguration.schedules[group.id],
}))

const calendarMockEvents: CalendarEvent[] = [
  { id: 'today', date: todayDate, title: 'Atividades do dia', category: 'today' },
  ...trainingEvents,
  ...monthlyEvents,
  ...currentMonthGroups,
  ...nearbyGroups,
]

export const mockEvents: CalendarEvent[] = calendarMockEvents.map((event, index) => {
  if (event.category === 'today' || event.configuration) return event
  const groupId = `${event.id}-group-1`
  const participants = Array.from({ length: 4 }, (_, offset) => mockEventCollaborators[(index + offset) % mockEventCollaborators.length])
  const configuration: EventConfiguration = {
    creatorId: mockEventManager.id,
    draft: {
      title: event.title,
      description: `${event.title}: encontro para revisar as atividades de prevenção, acompanhar pendências e alinhar as próximas entregas da equipe. Os colaboradores selecionados devem participar no horário programado e registrar a conclusão conforme as configurações do evento.`,
      type: 'Evento',
      nr: 'NR 1',
      externalLink: 'https://www.gov.br/trabalho-e-emprego',
    },
    selectedIds: participants.map(person => person.id),
    groups: [{ id: groupId, name: 'Grupo 1' }],
    assignments: Object.fromEntries(participants.map(person => [person.id, groupId])),
    schedules: { [groupId]: { date: event.date, startTime: event.startTime, endTime: event.endTime } },
    settings: { completion: index % 2 ? 'collaborator' : 'manager', evidenceRequired: index % 2 ? 'optional' : 'required' },
  }
  return { ...event, eventId: event.id, configuration }
})
