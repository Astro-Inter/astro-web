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
  source?: 'spreadsheet' | 'manual'
}

export interface WorkspaceAddressState {
  units: WorkspaceUnitAddress[]
  activeId: number
  nextId: number
}

export type WorkspaceAddressField = Exclude<keyof WorkspaceUnitAddress, 'id' | 'source'>

export type PostalAddress = Pick<WorkspaceUnitAddress, 'state' | 'city' | 'neighborhood' | 'street'>

export interface PostalCodeLookupState {
  unitId: number
  cep: string
  status: 'idle' | 'loading' | 'success' | 'error'
  message: string
}
