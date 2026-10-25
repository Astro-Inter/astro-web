import type { NrDemoScenario, NrDocument, NrReviewFilters } from '../types/nrReview'

/** Linear comparison: preserve common words at both ends and mark the changed passage. */
export function nrTextDifference(before: string, after: string): { before: [string, string, string]; after: [string, string, string] } {
  const left = before.split(/(\s+)/), right = after.split(/(\s+)/)
  let start = 0
  while (start < left.length && start < right.length && left[start] === right[start]) start++
  let end = 0
  while (end < left.length - start && end < right.length - start && left[left.length - end - 1] === right[right.length - end - 1]) end++
  function parts(tokens: string[]): [string, string, string] {
    return [tokens.slice(0, start).join(''), tokens.slice(start, tokens.length - end).join(''), end ? tokens.slice(-end).join('') : '']
  }
  return { before: parts(left), after: parts(right) }
}

export function validateNrDocument(document: NrDocument): Partial<Record<keyof NrDocument, string>> {
  const errors: Partial<Record<keyof NrDocument, string>> = {}
  for (const field of ['nome', 'descricao', 'objetivo', 'aplicabilidade'] as const) {
    if (!document[field].trim()) errors[field] = 'Preencha este campo.'
    else if (document[field].length > (field === 'nome' ? 300 : 20000)) errors[field] = 'O texto excede o tamanho permitido.'
  }
  if (!Number.isSafeInteger(document.tempo_reciclagem_meses) || document.tempo_reciclagem_meses <= 0) errors.tempo_reciclagem_meses = 'Informe um número inteiro positivo de meses.'
  if (!['Colaborador', 'Empresa'].includes(document.usabilidade)) errors.usabilidade = 'Selecione Colaborador ou Empresa.'
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(document.ultima_atualizacao)
  const date = match ? new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]))) : null
  if (!match || !date || date.getUTCFullYear() !== Number(match[3]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[1])) errors.ultima_atualizacao = 'Informe uma data válida em DD/MM/AAAA.'
  return errors
}

export const nrReviewFields = [
  ['nome', 'Nome'], ['descricao', 'Descrição'], ['objetivo', 'Objetivo'], ['aplicabilidade', 'Aplicabilidade'],
  ['revogada', 'Situação de revogação'], ['usabilidade', 'Usabilidade'],
  ['tempo_reciclagem_meses', 'Tempo de reciclagem'], ['ultima_atualizacao', 'Data da fonte oficial'],
] as const satisfies readonly (readonly [keyof NrDocument, string])[]

export function formatNrField(document: NrDocument, field: keyof NrDocument): string {
  if (field === 'revogada') return document.revogada ? 'Revogada' : 'Não revogada'
  if (field === 'tempo_reciclagem_meses') return `${document.tempo_reciclagem_meses} meses`
  return String(document[field])
}
export function filterPendingNrs(documents: readonly NrDocument[], filters: NrReviewFilters): NrDocument[] {
  const query = filters.search.trim().toLocaleLowerCase('pt-BR').replace(/^nr[\s-]*/, '')
  return documents.filter(document => (`${document._id} ${document.nome}`.toLocaleLowerCase('pt-BR').includes(query))
    && (!filters.usability || document.usabilidade === filters.usability)
    && (!filters.revoked || String(document.revogada) === filters.revoked))
}
export function parseNrId(value: string | null | undefined): number | null {
  if (!value || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}
export function nrDemoScenario(value: string | null): NrDemoScenario {
  return value === 'empty' || value === 'load-error' || value === 'approval-error' || value === 'slow' ? value : 'normal'
}
export function nrReviewLink(scenario: NrDemoScenario, id?: number): string {
  const query = new URLSearchParams({ scenario })
  return `/admin/nrs/pending${id === undefined ? '' : `/${id}`}?${query}`
}
