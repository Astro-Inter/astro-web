export interface WorkspaceUnitAddress {
  id: number
  name: string
  cep: string
  state: string
  city: string
  neighborhood: string
  street: string
  number: string
  complement: string
}

export interface WorkspaceAddressState {
  units: WorkspaceUnitAddress[]
  activeId: number
  nextId: number
}

export type WorkspaceAddressField = Exclude<keyof WorkspaceUnitAddress, 'id'>
