import { useEffect, useRef, useState } from 'react'
import type { ChatFileBlock } from '../types/chatBlocks'
import { downloadChatFile } from '../services/chatFiles'
import { chatFileExpiration, chatFileState } from '../utils/chatFiles'

export function useChatFileDownload(file: ChatFileBlock) {
  const [state, setState] = useState(() => ({ now: Date.now(), pending: false, error: '' }))
  const operation = useRef<AbortController | null>(null)
  const status = chatFileState(file, state.now)

  useEffect(() => {
    let timer: number | undefined
    const expires = chatFileExpiration(file.expira_em)
    function checkExpiration() {
      window.clearTimeout(timer)
      const now = Date.now()
      setState(current => ({ ...current, now }))
      if (expires !== null && expires > now) timer = window.setTimeout(checkExpiration, Math.min(expires - now, 2147483647))
    }
    checkExpiration()
    window.addEventListener('focus', checkExpiration)
    document.addEventListener('visibilitychange', checkExpiration)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', checkExpiration)
      document.removeEventListener('visibilitychange', checkExpiration)
      operation.current?.abort()
      operation.current = null
    }
  }, [file.id, file.url, file.expira_em, file.estado])

  async function download() {
    if (operation.current) return
    if (chatFileState(file) !== 'disponivel') {
      setState(current => ({ ...current, now: Date.now() }))
      return
    }
    const controller = new AbortController()
    operation.current = controller
    setState(current => ({ ...current, pending: true, error: '' }))
    try {
      const blob = await downloadChatFile(file, controller.signal)
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      try {
        const link = document.createElement('a')
        link.href = url
        link.download = file.nome
        link.referrerPolicy = 'no-referrer'
        document.body.append(link)
        try { link.click() } finally { link.remove() }
      } finally { window.setTimeout(() => URL.revokeObjectURL(url), 1000) }
    } catch {
      if (!controller.signal.aborted) setState(current => ({ ...current, error: 'Não foi possível baixar o PDF diretamente. Tente novamente ou abra o mesmo arquivo no navegador enquanto o link estiver válido.' }))
    } finally {
      if (operation.current === controller) operation.current = null
      if (!controller.signal.aborted) setState(current => ({ ...current, pending: false, now: Date.now() }))
    }
  }
  function openInBrowser() {
    if (chatFileState(file) !== 'disponivel' || !file.url) {
      setState(current => ({ ...current, now: Date.now() }))
      return
    }
    try {
      // Navegação explícita para a MESMA capacidade; não requer CORS nem cabeçalhos Astro.
      window.open(file.url, '_blank', 'noopener,noreferrer')
    } catch {
      setState(current => ({ ...current, error: 'Não foi possível abrir o PDF. Verifique o navegador ou solicite a geração novamente.' }))
    }
  }
  return { status, pending: state.pending, error: state.error, download, openInBrowser }
}
