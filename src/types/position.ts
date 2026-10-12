export interface Position {
  id: string
  name: string
  collaboratorCount: number
  active: boolean
}

export interface PositionFormValues {
  name: string
  active: boolean
}
