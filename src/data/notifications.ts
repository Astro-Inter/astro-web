import type { AppNotification, NotificationKind } from '../types/notification'

export const notificationKindAppearance = {
  training: { icon: 'warning-circle', color: 'error' },
  event: { icon: 'event-calendar', color: 'blue' },
  compliance: { icon: 'compliance', color: 'green' },
} as const satisfies Record<NotificationKind, { icon: string; color: string }>

export const mockNotifications: AppNotification[] = [
  { id: 'treinamento-nr5', kind: 'training', title: 'Pendência de treinamento', description: 'O treinamento da NR-5 contém pendências' },
  { id: 'evento-amanha', kind: 'event', title: 'Evento agendado', description: 'Evento obrigatório amanhã às 15:30' },
  { id: 'conformidade-baixa', kind: 'compliance', title: 'Conformidade', description: 'O nível de conformidade está abaixo do esperado' },
]
