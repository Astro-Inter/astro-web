import type { Position } from './position'
import type { Unit } from './unit'

export type CollaboratorStatus = 'PRE_CADASTRADO' | 'ATIVO' | 'DESATIVADO'
export type CollaboratorModality = 'HIBRIDO' | 'REMOTO' | 'PRESENCIAL'

export interface CollaboratorSummaryResponse {
  id: number
  name: string
  email: string
  roleId: number
  roleName: string
  unitId: number
  unitName: string
  status: CollaboratorStatus
  profilePhotoUrl?: string | null
  avatarInitials?: string | null
  canManage?: boolean
}

export interface CollaboratorDetailsResponse extends CollaboratorSummaryResponse {
  cpf?: string | null
  workModel?: CollaboratorModality | '' | null
  workspaceId: number
}

export interface Collaborator {
  id: string
  name: string
  email: string
  roleId: string
  position: string
  unitId: string
  unit: string
  status: CollaboratorStatus
  profilePhotoUrl: string | null
  avatarInitials: string | null
  canManage?: boolean
}

export interface CollaboratorDetails extends Collaborator {
  cpf: string
  modality: CollaboratorModality | ''
}

export interface CollaboratorFormValues {
  name: string
  cpf: string
  email: string
  roleId: string
  unitId: string
  modality: CollaboratorModality | ''
  status: CollaboratorStatus
}

export interface CollaboratorOptions {
  positions: Position[]
  units: Unit[]
}

export interface CreateCollaboratorRequest {
  name: string
  cpf: string
  email: string
  roleId: number
  unitId: number
  workModel: CollaboratorModality
}

export interface UpdateCollaboratorRequest extends CreateCollaboratorRequest {
  status: CollaboratorStatus
}
