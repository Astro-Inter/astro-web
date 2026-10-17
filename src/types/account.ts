export interface AccountProfile {
  name: string
  email: string
  units: string
  position: string
  modality: string
  photoUrl?: string
}

export interface AccountProfileResponse {
  nome: string
  email: string | null
  cargo: string | null
  unidade: string | null
  modalidade: string | null
  profilePhotoUrl: string | null
}

export interface AccountPhotoUpdate {
  pending: boolean
  error: string
  message: string
  needsRefresh: boolean
}

export interface AccountDetails extends AccountProfile {
  cpf: string
  roleId: string
  unitId: string
  workModel: '' | 'HIBRIDO' | 'REMOTO' | 'PRESENCIAL'
}

export interface AccountFormValues {
  name: string
  cpf: string
  email: string
  roleId: string
  unitId: string
  workModel: AccountDetails['workModel']
}

export interface UpdateAccountDetailsRequest {
  name: string
  cpf: string
  email: string
  roleId: number
  unitId: number
  workModel: string
}
