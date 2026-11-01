export interface RoleResponse {
  roleId: number
  workspaceId: number
  name: string
  collaboratorCount: number
  status: string
}

export interface RoleNrResponse {
  nrCode: number
  description: string
}

export interface RoleNrOptionResponse {
  nr: number
  description: string
  active: boolean
}

export interface RoleNrRequest {
  nr: number
  active: boolean
}
