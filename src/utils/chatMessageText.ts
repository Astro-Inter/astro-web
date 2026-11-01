import { parseBlocks } from './chatBlocks'

/** Prévia textual compartilhada pelo POST e histórico, sem alterar o snapshot. */
export function chatMessageText(legacy: string | undefined, value: unknown): string {
  const blocks = parseBlocks(value)
  const content = blocks?.flatMap(block => block.tipo === 'texto' ? [block.conteudo] : []).join('\n\n')
  if (content) return content
  if (legacy) return legacy
  const titles = blocks?.flatMap(block => 'titulo' in block ? [block.titulo] : block.tipo === 'contexto_dados' ? ['Contexto dos dados'] : [])
  return titles?.join(' · ') || 'Não foi possível exibir esta resposta.'
}
