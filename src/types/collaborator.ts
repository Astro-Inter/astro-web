import type { Position } from './position'
import type { Unit } from './unit'

export type CollaboratorStatus = 'PRE_CADASTRADO' | 'ATIVO' | 'DESATIVADO'
export type CollaboratorModality = 'HIBRIDO' | 'REMOTO' | 'PRESENCIAL'

export interface CollaboratorSummaryResponse {
  id_usuario: number
  nome: string
  email: string
  cargo_id: number
  cargo: string
  unidade_id: number
  unidade: string
  status: CollaboratorStatus
  profilePhotoUrl?: string | null
  avatarInitials?: string | null
}

export interface CollaboratorDetailsResponse extends CollaboratorSummaryResponse {
  cpf?: string | null
  modalidade?: CollaboratorModality | '' | null
  workspace_id: number
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
  nome: string
  cpf: string
  email: string
  roleId: number
  unitId: number
  modalidade: CollaboratorModality
}

export interface UpdateCollaboratorRequest extends CreateCollaboratorRequest {
  status: CollaboratorStatus
}
