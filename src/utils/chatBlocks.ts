import type { ChatBlock, KeyedChatItem } from '../types/chatBlocks'

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 6000
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const list = (value: unknown, max: number): value is unknown[] => Array.isArray(value) && value.length > 0 && value.length <= max
const integer = (value: unknown, minimum: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum
const nullableText = (value: unknown, max: number): boolean => value === null || typeof value === 'string' && value.length <= max

export function parseBlocks(value: unknown): ChatBlock[] | null {
  if (!list(value, 10)) return null
  for (const block of value) {
    if (!object(block)) return null
    if (block.tipo === 'texto') { if (!text(block.conteudo)) return null; continue }
    if (block.versao !== 1 || !text(block.titulo)) return null
    if (block.tipo === 'grafico_barras' || block.tipo === 'grafico_linhas' || block.tipo === 'grafico_setores') {
      if (!text(block.fonte) || !text(block.unidade) || !list(block.dados, 12)
        || !block.dados.every(point => object(point) && text(point.categoria) && typeof point.valor === 'number' && Number.isFinite(point.valor) && point.valor >= 0)
        || !Number.isFinite(block.dados.reduce<number>((total, point) => total + (point as { valor: number }).valor, 0))) return null
    } else if (block.tipo === 'tabela') {
      const columns = block.colunas
      if (!list(columns, 10) || !columns.every(column => object(column) && text(column.chave) && /^[a-z][a-z0-9_]{0,39}$/.test(column.chave) && text(column.titulo))
        || new Set(columns.map(column => (column as { chave: string }).chave)).size !== columns.length
        || !list(block.linhas, 50) || !block.linhas.every(row => object(row) && columns.every(column => {
          const cell = row[(column as { chave: string }).chave]
          return nullableText(cell, 6000) || typeof cell === 'number' && Number.isFinite(cell)
        })) || !integer(block.pagina, 1) || !integer(block.total_paginas, 1) || block.pagina > block.total_paginas
        || !integer(block.total, 0) || block.total < block.linhas.length) return null
    } else if (block.tipo === 'galeria_usuarios') {
      if (!list(block.imagens, 50) || !block.imagens.every(person => object(person) && text(person.nome)
        && nullableText(person.email, 320) && nullableText(person.url, 8192))) return null
    } else return null
  }
  return value as ChatBlock[]
}

export function safeChatImage(value: string | null): string | undefined {
  try {
    if (!value) return undefined
    const url = new URL(value)
    if (url.protocol === 'https:' && !url.username && !url.password && url.hostname.endsWith('.r2.cloudflarestorage.com')) return url.href
  } catch { /* A foto inválida usa as iniciais. */ }
  return undefined
}

/** Identidade por conteúdo, pois o contrato dos blocos não fornece IDs. Duplicatas recebem sufixos únicos. */
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
