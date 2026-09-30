import type { CalendarEvent, EventCategory } from '../types/events'

export const eventCategoryLabels: Record<EventCategory, string> = {
  today: 'Dia atual',
  commitment: 'Compromisso',
  reminder: 'Lembrete',
}

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
    category: index % 2 === 0 ? 'commitment' as const : 'reminder' as const,
  }))
}

const monthlyEvents = Array.from({ length: 12 }, (_, month): CalendarEvent[] => [
  { id: `monthly-${month}-1`, date: dateInYear(month, 7), startTime: '10:00', endTime: '11:00', title: 'Acompanhamento mensal', category: 'commitment' },
  { id: `monthly-${month}-2`, date: dateInYear(month, 21), startTime: '15:00', endTime: '16:00', title: 'Preparar próximos passos', category: 'reminder' },
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

export const mockEvents: CalendarEvent[] = [
  { id: 'today', date: todayDate, title: 'Atividades do dia', category: 'today' },
  ...monthlyEvents,
  ...currentMonthGroups,
  ...nearbyGroups,
]
