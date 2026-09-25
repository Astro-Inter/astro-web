export interface Position {
  id: string
  name: string
  collaboratorCount: number
  unit: string
  active: boolean
}

export interface PositionFormValues {
  name: string
  collaboratorCount: string
  unit: string
  active: boolean
}
