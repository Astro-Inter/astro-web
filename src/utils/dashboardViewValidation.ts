export function validateDashboardViewName(value: string, existingNames: readonly string[]): string {
  const name = value.trim()
  if (!name || name.length > 120) return 'Informe um nome de até 120 caracteres.'
  if (existingNames.some(existing => existing.trim().toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) return 'Já existe uma visão com esse nome.'
  return ''
}
