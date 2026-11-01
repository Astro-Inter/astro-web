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
  modality: 'Presencial' | 'Remoto' | 'Híbrido' | 'Não informado'
  profilePhotoUrl?: string | null
  avatarInitials?: string | null
}

export interface EventGroup {
  id: string
  name: string
}

export interface EventGroupSchedule {
  date: string
  endDate?: string
  startTime: string
  endTime: string
  originalStart?: string
  originalEnd?: string
}

export interface EventSettings {
  completion: string
  evidenceRequired: string
}

export interface EventConfiguration {
  collaborators?: EventCollaborator[]
  permissions?: { canEdit: boolean; canCancel: boolean; detailsEditable: boolean; lockedGroupIds: string[] }
  creatorId: string
  draft: EventDraft
  selectedIds: string[]
  groups: EventGroup[]
  assignments: Record<string, string>
  schedules: Record<string, EventGroupSchedule>
  settings: EventSettings
}

export type EventCreationStep = 'details' | 'collaborators' | 'groups' | 'schedule' | 'settings' | 'review'

export type EventCreationForm = Pick<EventConfiguration, 'draft' | 'selectedIds' | 'groups' | 'assignments' | 'schedules' | 'settings'>
