import { useEffect, useState } from 'react'
import type { ChatFileBlock } from '../types/chatBlocks'
import { chatFileExpiration, chatFileState } from '../utils/chatFiles'

export function useChatFileOpen(file: ChatFileBlock) {
  const [state, setState] = useState(() => ({ now: Date.now(), error: '' }))
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
    }
  }, [file.id, file.url, file.expira_em, file.estado])

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
  return { status, error: state.error, openInBrowser }
}
