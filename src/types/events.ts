import type { EventConfiguration } from './eventCreation'

export type EventCategory = 'today' | 'event'
export type CalendarView = 'week' | 'month' | 'year'

interface CalendarEventBase {
  id: string
  date: string
  title: string
  eventId?: string
  configuration?: EventConfiguration
  eventNumber?: number
  inactive?: boolean
  status?: EventStatus
}

export type CalendarEvent = CalendarEventBase & (
  | { category: 'today' }
  | { category: Exclude<EventCategory, 'today'>; startTime: string; endTime: string }
)

export type EventStatus = 'ATIVO' | 'CONCLUIDO' | 'CANCELADO'
export interface EventCalendarResponse {
  eventId: number
  eventTitle: string
  eventClassId: number
  className: string
  startDate: string
  endDate: string
  status: EventStatus
}
export interface EventCandidateResponse {
  id: number
  name: string
  email: string | null
  roleId: number | null
  roleName: string | null
  unitId: number | null
  unitName: string | null
  workModel: 'PRESENCIAL' | 'REMOTO' | 'HIBRIDO' | null
}
export interface EventParticipantResponse { id: number; name: string; email: string | null; participationId: number }
export interface EventClassResponse {
  id: number
  name: string
  startDate: string
  endDate: string
  editable: boolean
  participants: EventParticipantResponse[]
}
export interface EventResponse {
  id: number
  title: string
  description: string
  nrId: number | null
  externalLink: string | null
  completionMode: 'COLABORADOR' | 'GESTOR'
  mandatoryEvidence: boolean
  status: EventStatus
  cancellationDate: string | null
  cancellationReason: string | null
  managerId: number
  canEdit: boolean
  canCancel: boolean
  detailsEditable: boolean
  eventClasses: EventClassResponse[]
}
export interface EventClassRequest { id?: number; name: string; startDate: string; endDate: string; participantIds: number[] }
export interface UpdateEventRequest { title: string; description: string; externalLink: string | null; eventClasses: EventClassRequest[] }
export interface CreateEventRequest extends UpdateEventRequest { nrId: number | null; completionMode: 'COLABORADOR' | 'GESTOR'; mandatoryEvidence: boolean }
export interface EventNrOption { code: number; title: string }
export interface CollaboratorEventResponse { id: number; eventTitle: string; classLimitDate: string; viewed: boolean; classStatus: string; className: string; eventStatus: EventStatus }
export interface EventEvidenceResponse { evidenceId: number; originalName: string; url: string; mimeType: string; sizeBytes: number }
export interface CollaboratorEventDetailsResponse {
  eventId: number; eventTitle: string; classLimitDate: string; classStatus: string; eventDescription: string
  complianceValidity: string | null; externalLink: string | null; managerId: number; managerName: string
  evidenceMandatory: boolean; completionMode: 'COLABORADOR' | 'GESTOR'; evidences: EventEvidenceResponse[]
}
export interface EventCompletionResponse { id: number; status: 'PENDENTE' | 'CONCLUIDO' | 'REJEITADO'; completionDate: string }
