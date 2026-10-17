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
