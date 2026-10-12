export interface RoleResponse {
  id_cargo: number
  id_workspace: number
  nome: string
  quantidade_colaboradores: number
  status: string
}

export interface RoleNrResponse {
  codigo_nr: number
  descricao: string
}

export interface RoleNrOptionResponse {
  nr: number
  descricao: string
  ativo: boolean
}

export interface RoleNrRequest {
  nr: number
  ativo: boolean
}
