import type { ChatFileBlock } from '../types/chatBlocks'

export function safeChatFileUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 8192 || /[\s\\]/.test(value)) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch { return false }
}

export function chatFileExpiration(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(value)) return null
  const time = Date.parse(value)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19) ? time : null
}

export function chatFileState(file: ChatFileBlock, now = Date.now()): ChatFileBlock['estado'] {
  const expires = chatFileExpiration(file.expira_em)
  if (file.estado === 'expirado') return 'expirado'
  if (file.estado !== 'disponivel' || expires === null) return 'indisponivel'
  if (expires <= now) return 'expirado'
  if (!safeChatFileUrl(file.url)) return 'indisponivel'
  return 'disponivel'
}
