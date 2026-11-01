import type { ChatFileBlock } from '../../types/chatBlocks'
import { useChatFileOpen } from '../../hooks/useChatFileOpen'
import AstroIcon from '../astroIcon'

interface ChatBlockFileProps { file: ChatFileBlock }
export default function ChatBlockFile({ file }: ChatBlockFileProps) {
  const { status, error, openInBrowser } = useChatFileOpen(file)
  return <section className="chat-data-card chat-file-card" aria-label={`Arquivo PDF: ${file.nome}`} data-track-ignore="true">
    <div className="chat-file-heading"><AstroIcon name="document" /><div><h4>{file.nome}</h4>
      <span>PDF{file.tamanho_bytes !== null ? ` · ${(file.tamanho_bytes / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kB` : ''}</span></div></div>
    <p role="status">{status === 'expirado' ? 'Link expirado; solicite a geração novamente.' : status === 'indisponivel' ? 'Arquivo indisponível. Solicite a geração novamente.' : 'Arquivo disponível para abrir no navegador.'}</p>
    <button type="button" disabled={status !== 'disponivel'} onClick={openInBrowser} aria-label={`Abrir PDF no navegador: ${file.nome}`}>
      <AstroIcon name="document" />Abrir PDF no navegador</button>
    {error && <p role="alert">{error}</p>}
  </section>
}
