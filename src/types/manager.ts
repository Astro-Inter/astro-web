export interface Manager {
  id: string
  name: string
  email: string
  unit: string
  active: boolean
}

export interface ManagerInviteValues {
  collaboratorId: string
  status: '' | 'active' | 'inactive'
}
