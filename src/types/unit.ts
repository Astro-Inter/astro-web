export interface Unit {
  id: string
  name: string
  collaboratorCount: number
  active: boolean
}
export interface UnitResponse {
  id_unidade: number
  id_workspace: number
  nome: string
  quantidade_colaboradores: number
  status: string
}

export interface UnitNrResponse {
  nr: number
  descricao: string
}

export interface UnitNrOptionResponse extends UnitNrResponse {
  ativo: boolean
}

export interface UnitNrRequest {
  nr: number
  ativo: boolean
}
