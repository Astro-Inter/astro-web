export interface AccountProfile {
  name: string
  email: string
  units: string
  position: string
  modality: string
  photoUrl?: string
}

export interface AccountProfileResponse {
  name: string
  email: string | null
  roleName: string | null
  unitName: string | null
  workModel: string | null
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
