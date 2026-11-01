export interface Unit {
  id: string
  name: string
  collaboratorCount: number
  active: boolean
}
export interface UnitResponse {
  unitId: number
  workspaceId: number
  name: string
  collaboratorCount: number
  status: string
  postalCode: string | null
  state: string | null
  city: string | null
  neighborhood: string | null
  street: string | null
  number: string | null
  addressLine2: string | null
}

export interface UnitNrResponse {
  nr: number
  description: string
}

export interface UnitNrOptionResponse extends UnitNrResponse {
  active: boolean
}

export interface UnitNrRequest {
  nr: number
  active: boolean
}
