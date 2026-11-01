export interface ListFilterField {
  id: string
  label: string
  kind?: 'number'
  options?: readonly { value: string; label: string; tone?: 'default' | 'muted' }[]
  minimumField?: string
}

export interface ListFilterControlProps {
  label: string
  fields: readonly ListFilterField[]
  values: Record<string, string>
  onApply: (values: Record<string, string>) => void
}
