import type { CollaboratorDetails, CollaboratorDetailsResponse, CollaboratorFormValues, CollaboratorSummaryResponse } from './collaborator'

export type ManagerSummaryResponse = Pick<CollaboratorSummaryResponse, 'id' | 'name' | 'email' | 'unitId' | 'unitName' | 'status' | 'profilePhotoUrl' | 'avatarInitials'>
export interface ManagerDetailsResponse extends CollaboratorDetailsResponse {}
export type ManagerSummary = Pick<CollaboratorDetails, 'id' | 'name' | 'email' | 'unitId' | 'unit' | 'status' | 'profilePhotoUrl' | 'avatarInitials'>
export interface ManagerDetails extends CollaboratorDetails {}
export interface ManagerFormValues extends CollaboratorFormValues {}
export interface UpdateManagerRequest {
  name: string
  cpf: string
  email: string
  roleId: number
  unitId: number
  workModel: 'HIBRIDO' | 'REMOTO' | 'PRESENCIAL'
  status: ManagerFormValues['status']
}
export interface PromoteManagerRequest {
  collaboratorId: number
  status: 'ATIVO' | 'DESATIVADO'
}

export interface Manager {
  id: string
  name: string
  email: string
  unit: string
  active: boolean
  cpf: string
  position: string
  modality: string
}

export type ManagerDetailsValues = Pick<Manager, 'name' | 'email' | 'cpf' | 'unit' | 'position' | 'modality' | 'active'>

export interface ManagerInviteValues {
  collaboratorId: string
  status: '' | 'active' | 'inactive'
}
