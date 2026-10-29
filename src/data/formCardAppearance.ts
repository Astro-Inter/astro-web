import type { FormCardAppearance, FormCardColor, FormCardIcon } from '../types/forms'

// A ordem dos ícones e cores compõe o marcador ac1 salvo nos títulos.
export const formCardIcons: readonly { value: FormCardIcon; label: string }[] = [
  { value: 'document', label: 'Documento' }, { value: 'calendar', label: 'Calendário' },
  { value: 'feedback', label: 'Feedback' }, { value: 'person-outline', label: 'Pessoa' },
  { value: 'security', label: 'Credencial' }, { value: 'check', label: 'Verificação' },
  { value: 'building', label: 'Unidade' }, { value: 'collaborators', label: 'Equipe' },
  { value: 'position', label: 'Cargo' }, { value: 'clock', label: 'Prazo' },
]
export const formCardColors: readonly { value: FormCardColor; label: string; background: string }[] = [
  { value: 'purple', label: 'Roxo', background: '#a42be1' }, { value: 'pink', label: 'Rosa', background: '#ed007f' },
  { value: 'blue', label: 'Azul', background: '#429dc5' }, { value: 'green', label: 'Verde', background: '#57a768' },
  { value: 'teal', label: 'Turquesa', background: '#087f76' }, { value: 'indigo', label: 'Índigo', background: '#5542a2' },
  { value: 'orange', label: 'Laranja', background: '#a84f0c' }, { value: 'rose', label: 'Vermelho', background: '#b73c57' },
  { value: 'violet', label: 'Violeta', background: '#814bb5' }, { value: 'slate', label: 'Cinza', background: '#5e607a' },
]
export function isFormCardAppearance(value: unknown): value is FormCardAppearance {
  if (!value || typeof value !== 'object' || !('icon' in value) || !('color' in value)) return false
  return formCardIcons.some(icon => icon.value === value.icon) && formCardColors.some(color => color.value === value.color)
}
