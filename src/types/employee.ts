export interface Employee {
  id: string
  name: string
  email: string
  unit: string
  position: string
  modality: string
  cpf: string
  active: boolean
}

export interface EmployeeInviteValues {
  name: string
  cpf: string
  email: string
  password: string
  unit: string
  position: string
  modality: string
  status: '' | 'active' | 'inactive'
}
