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
