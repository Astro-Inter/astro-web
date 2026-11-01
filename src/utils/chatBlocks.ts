import type { ChatBlock, ChatImageCell, KeyedChatItem } from '../types/chatBlocks'
import { chatFileExpiration, safeChatFileUrl } from './chatFiles'

const text = (value: unknown, max = 6000): value is string => typeof value === 'string' && value.length > 0 && value.length <= max
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const list = (value: unknown, max: number, min = 1): value is unknown[] => Array.isArray(value) && value.length >= min && value.length <= max
const integer = (value: unknown, minimum = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum
const nullableText = (value: unknown, max = 6000): boolean => value === null || typeof value === 'string' && value.length <= max
const optionalText = (value: unknown): boolean => value === undefined || nullableText(value)
export const isChatImage = (value: unknown): value is ChatImageCell => object(value) && value.tipo === 'imagem' && text(value.descricao) && nullableText(value.url, 8192)
const cell = (value: unknown): boolean => nullableText(value) || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) || isChatImage(value)
const date = (value: unknown): boolean => value === null || typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
const strings = (value: unknown): boolean => list(value, 8, 0) && value.every(item => text(item, 500))
// A API arredonda em Python; empates decimais não seguem necessariamente Math.round.
const percentage = (value: unknown, numerator: number, denominator: number): boolean => denominator === 0
  ? value === null : typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 && Math.abs(value - 100 * numerator / denominator) <= 0.005000001

function summary(b: Record<string, unknown>): boolean {
  if (!integer(b.solicitada, 1) || !integer(b.retornada) || !integer(b.total) || b.retornada > Math.min(b.solicitada, b.total, 200)) return false
  const limited = b.retornada < Math.min(b.solicitada, b.total)
  return b.tem_mais === (b.retornada < b.total) && b.limitado === limited
    && (limited ? b.motivo_limite === 'maximo_resultados' || b.motivo_limite === 'tamanho_resposta' : b.motivo_limite === null)
}
function validBlock(block: unknown): boolean {
  if (!object(block)) return false
  if (block.tipo === 'texto') return text(block.conteudo)
  if (block.tipo === 'arquivo') {
    return block.versao === 1 && typeof block.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(block.id)
      && text(block.nome, 100) && /^[a-zA-Z0-9_-]+\.pdf$/.test(block.nome) && block.mime_type === 'application/pdf'
      && (block.tamanho_bytes === null || integer(block.tamanho_bytes, 1) && block.tamanho_bytes <= 2000000)
      && (block.url === null || safeChatFileUrl(block.url)) && chatFileExpiration(block.expira_em) !== null
      && ['disponivel', 'expirado', 'indisponivel'].includes(String(block.estado))
  }
  if (block.tipo === 'contexto_dados') {
    return block.versao === 1 && text(block.fonte, 200) && date(block.referencia) && date(block.inicio) && date(block.fim)
      && ((block.inicio === null && block.fim === null) || (typeof block.inicio === 'string' && typeof block.fim === 'string' && block.inicio <= block.fim))
      && text(block.escopo) && object(block.filtros) && Object.keys(block.filtros).length <= 12
      && Object.entries(block.filtros).every(([key, value]) => ['nome', 'cargo', 'unidade', 'nr', 'evento_id', 'conformidade_id', 'incluir_agendados', 'status'].includes(key)
        && (value === null || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) || typeof value === 'string' || Array.isArray(value) && value.every(v => typeof v === 'string')) && JSON.stringify(value).length <= 300)
      && strings(block.criterios) && strings(block.avisos) && object(block.conjunto) && summary(block.conjunto) && text(block.conjunto.unidade_total)
  }
  if (!text(block.titulo) || (block.versao !== 1 && !(block.tipo === 'tabela' && block.versao === 2))) return false
  if (['grafico_barras', 'grafico_linhas', 'grafico_setores', 'grafico_rosca'].includes(String(block.tipo))) {
    return text(block.fonte) && text(block.unidade) && list(block.dados, 12)
      && block.dados.every(point => object(point) && text(point.categoria, 100) && integer(point.valor))
      && Number.isSafeInteger(block.dados.reduce<number>((total, point) => total + (point as { valor: number }).valor, 0))
  }
  if (block.tipo === 'tabela' || block.tipo === 'matriz_conformidade') {
    const columns = block.colunas, rows = block.linhas
    const local = block.tipo === 'matriz_conformidade' || block.versao === 2
    if (!list(columns, 10) || !columns.every(column => object(column) && text(column.chave) && /^[a-z][a-z0-9_]{0,39}$/.test(column.chave) && text(column.titulo))
      || new Set(columns.map(column => (column as { chave: string }).chave)).size !== columns.length
      || !list(rows, local ? 200 : 50, local ? 0 : 1) || !rows.every(row => object(row) && columns.every(column => cell(row[(column as { chave: string }).chave])))
      || !integer(block.pagina, 1) || !integer(block.total_paginas, 1) || block.pagina > block.total_paginas || !integer(block.total) || block.total < rows.length) return false
    if (local && !(block.paginacao === 'local' && block.pagina === 1 && block.total_paginas === 1 && block.retornada === rows.length && summary(block))) return false
    if (block.tipo === 'matriz_conformidade') {
      if (block.chave_pessoa !== 'referencia_pessoa' || block.chave_categoria !== 'nr' || block.chave_situacao !== 'situacao') return false
      const keys = columns.map(c => (c as { chave: string }).chave)
      if (!['referencia_pessoa', 'nr', 'situacao'].every(key => keys.includes(key))) return false
      const identities = new Set<string>()
      for (const row of rows as Record<string, unknown>[]) {
        const key = `${row.referencia_pessoa}:${row.nr}`
        if (!integer(row.referencia_pessoa, 1) || !integer(row.nr, 1) || !['VIGENTE', 'VENCIDA', 'SEM_VALIDADE', 'SEM_REGISTRO'].includes(String(row.situacao)) || identities.has(key)) return false
        identities.add(key)
      }
    }
    return true
  }
  if (block.tipo === 'indicadores') {
    return block.abrangencia === 'conjunto_autorizado' && text(block.universo) && list(block.indicadores, 10)
      && new Set(block.indicadores.map(item => object(item) ? item.chave : undefined)).size === block.indicadores.length
      && block.indicadores.every(item => {
        if (!object(item) || !text(item.chave) || !text(item.rotulo, 120) || !text(item.criterio, 300)) return false
        if (item.unidade === '%') return integer(item.numerador) && integer(item.denominador) && item.numerador <= item.denominador
          && percentage(item.valor, item.numerador, item.denominador)
        return ['pessoas', 'pares_pessoa_nr', 'participações', 'conclusões', 'registros', 'conflitos', 'envios', 'meses'].includes(String(item.unidade))
          && integer(item.valor) && item.numerador === null && item.denominador === null
      })
  }
  if (block.tipo === 'ficha_usuario') {
    if (!['nome', 'email', 'cargo', 'unidade', 'perfil', 'situacao', 'modalidade'].every(key => optionalText(block[key]))
      || !(block.origem === undefined || block.origem === null || block.origem === 'usuario_autenticado')
      || !(block.foto === undefined || block.foto === null || isChatImage(block.foto))) return false
    const c = block.conformidade
    return c === null || c === undefined || object(c) && integer(c.total) && integer(c.vigentes) && c.vigentes <= c.total
      && text(c.criterio) && nullableText(c.data_referencia, 30) && percentage(c.percentual, c.vigentes, c.total)
  }
  if (block.tipo === 'galeria_usuarios') return list(block.imagens, 50) && block.imagens.every(person => object(person) && text(person.nome) && nullableText(person.email, 320) && nullableText(person.url, 8192))
  return false
}

/** Valida cada bloco separadamente para preservar os reconhecidos e sua ordem. */
export function parseBlocks(value: unknown): ChatBlock[] | null {
  if (!list(value, 10)) return null
  const blocks = value.filter(validBlock)
  return blocks.length ? blocks as ChatBlock[] : null
}
export function safeChatImage(value: string | null): string | undefined {
  try {
    if (!value) return undefined
    const url = new URL(value)
    if (url.protocol === 'https:' && !url.username && !url.password && url.hostname.endsWith('.r2.cloudflarestorage.com')) return url.href
  } catch { /* A foto inválida usa as iniciais. */ }
  return undefined
}

/** Não inclui o conteúdo ou URLs temporárias nas chaves do DOM. */
export function keyChatItems<T>(items: readonly T[]): KeyedChatItem<T>[] {
  const occurrences = new Map<string, number>()
  return items.map(item => {
    const content = JSON.stringify(item)
    let hash = 2166136261
    for (let position = 0; position < content.length; position++) hash = Math.imul(hash ^ content.charCodeAt(position), 16777619)
    const base = (hash >>> 0).toString(36)
    const occurrence = occurrences.get(base) ?? 0
    occurrences.set(base, occurrence + 1)
    return { key: `${base}-${occurrence}`, item }
  })
}
