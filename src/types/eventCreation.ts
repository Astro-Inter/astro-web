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
