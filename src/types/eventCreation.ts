export interface EventDraft {
  title: string
  description: string
  type: string
  nr: string
  externalLink: string
}

export interface EventCollaborator {
  id: string
  name: string
  email: string
  unit: string
  position: string
  modality: 'Presencial' | 'Remoto'
}

export interface EventGroup {
  id: string
  name: string
}

export interface EventGroupSchedule {
  date: string
  startTime: string
  endTime: string
}

export interface EventSettings {
  completion: string
  evidenceRequired: string
}

export interface EventConfiguration {
  draft: EventDraft
  selectedIds: string[]
  groups: EventGroup[]
  assignments: Record<string, string>
  schedules: Record<string, EventGroupSchedule>
  settings: EventSettings
}
