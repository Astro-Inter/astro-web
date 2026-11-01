import type { ChatFileBlock } from '../types/chatBlocks'
import { chatFileState } from '../utils/chatFiles'

/** Usa apenas a capacidade temporária recebida; não utiliza o cliente autenticado Astro. */
export async function downloadChatFile(file: ChatFileBlock, signal?: AbortSignal): Promise<Blob> {
  try {
    if (chatFileState(file) !== 'disponivel' || !file.url) throw new Error('Arquivo indisponível.')
    const response = await fetch(file.url, {
      method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store',
      headers: { Accept: 'application/pdf' }, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
    })
    if (!response.ok || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/pdf') throw new Error('Download indisponível.')
    const length = Number(response.headers.get('content-length'))
    if (length > 2000000) throw new Error('Arquivo excede o limite.')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Arquivo indisponível.')
    const chunks: Uint8Array<ArrayBuffer>[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > 2000000) { await reader.cancel(); throw new Error('Arquivo excede o limite.') }
        chunks.push(value)
      }
    } finally { reader.releaseLock() }
    if (!size || chatFileState(file) !== 'disponivel') throw new Error('Arquivo indisponível.')
    return new Blob(chunks, { type: 'application/pdf' })
  } catch {
    // Não propaga erros de fetch que possam incluir a URL temporária.
    throw new Error('Não foi possível baixar o PDF. Tente novamente; se o link expirou, solicite a geração novamente.')
  }
}
