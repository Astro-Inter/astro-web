const fieldLabels: Record<string, string> = {
  name: 'Nome', nome: 'Nome', cnpj: 'CNPJ', email: 'E-mail do gestor', password: 'Senha',
  cep: 'CEP', postalCode: 'CEP', state: 'Estado', uf: 'Estado', city: 'Cidade',
  neighborhood: 'Bairro', street: 'Rua', number: 'Número', addressLine2: 'Complemento',
  file: 'Planilha', cpf: 'CPF', cargo: 'Cargo', modalidade: 'Modalidade',
}

export function spreadsheetErrorFieldLabel(field: string): string {
  return field === 'email' ? 'E-mail' : fieldLabels[field] ?? field
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function labelFor(path: string): string {
  const normalized = path.replace(/\[(\d+)\]/g, '.$1').replace(/^(?:body\.|data\.)+/, '')
  const parts = normalized.split('.')
  const field = fieldLabels[parts.at(-1) ?? ''] ?? path
  const unit = normalized.match(/(?:^|\.)units\.(\d+)(?:\.|$)/)
  if (unit) return `Unidade ${Number(unit[1]) + 1} · ${field}`
  if (normalized.startsWith('workspace.')) return `Dados da empresa · ${field}`
  return field
}

export function registrationErrorMessage(body: unknown, fallback: string): string {
  if (!record(body)) return fallback
  const messages = new Set<string>()
  function read(value: unknown, field = '', depth = 0): void {
    if (depth > 4 || messages.size >= 30) return
    if (typeof value === 'string' && value.trim()) {
      messages.add(field ? `${labelFor(field)}: ${value.trim()}` : value.trim())
    } else if (Array.isArray(value)) {
      for (const item of value) read(item, field, depth + 1)
    } else if (record(value)) {
      // Os erros de linha já são exibidos separadamente pela tela.
      if (typeof value.row === 'number') return
      const message = value.message ?? value.defaultMessage ?? value.msg
      const path = typeof value.field === 'string' ? value.field
        : Array.isArray(value.loc) ? value.loc.filter(part => typeof part === 'string' || typeof part === 'number').join('.') : field
      if (typeof message === 'string') read(message, path, depth + 1)
      else for (const [key, item] of Object.entries(value)) {
        if (key === 'importErrors') continue
        read(item, field ? `${field}.${key}` : key, depth + 1)
      }
    }
  }
  for (const value of [body.errors, body.fieldErrors, body.validationErrors, body.detail]) read(value)
  if (Array.isArray(body.data)) read(body.data)
  else if (record(body.data)) {
    for (const value of [body.data.errors, body.data.fieldErrors, body.data.validationErrors]) read(value)
  }
  const rawMessage = typeof body.message === 'string' ? body.message.trim() : ''
  const generic = /^(?:erro de valida[çc][ãa]o|validation (?:error|failed)|bad request)\.?$/i.test(rawMessage)
  const heading = rawMessage && !generic ? rawMessage : fallback
  messages.delete(heading)
  if (generic && !messages.size) {
    return 'Alguns dados do cadastro não foram aceitos. O serviço não informou qual campo está incorreto. Revise os dados da empresa, os endereços das unidades e a planilha antes de tentar novamente.'
  }
  return [heading, ...messages].join('\n')
}
