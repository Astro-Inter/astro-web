export type NotificationKind = 'training' | 'event' | 'compliance'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  description: string
}
