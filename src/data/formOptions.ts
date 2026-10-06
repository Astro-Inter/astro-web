import { defaultNrsRows } from './regulatoryStandards'

export const managerOptions = [
  { value: '', label: 'Selecione o gestor', tone: 'muted' as const },
  { value: 'Gerente', label: 'Gerente' },
  { value: 'Diretor', label: 'Diretor' },
  { value: 'Coordenador', label: 'Coordenador' },
]
export const nrOptions = [
  { value: '', label: 'Selecionar a NR', tone: 'muted' as const },
  ...defaultNrsRows.map(({ code }) => ({ value: code, label: code })),
]
export const unitOptions = [
  { value: '', label: 'Selecionar a unidade', tone: 'muted' as const },
  { value: 'Sede 1', label: 'Sede 1' },
  { value: 'Sede 2', label: 'Sede 2' },
]
