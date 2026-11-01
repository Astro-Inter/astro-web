import { useChatBlocks } from '../../hooks/useChatBlocks'
import { keyChatItems } from '../../utils/chatBlocks'
import ChatBlockAvatar from '../chatBlockAvatar'
import ChatBlockGraphic from '../chatBlockGraphic'

import DataTable from '../chatBlockTable'
import Indicators from '../chatBlockIndicators'
import DataContext from '../chatBlockContext'
import UserProfile from '../chatBlockUserProfile'
import ChatBlockFile from '../chatBlockFile'

interface ChatBlocksProps { blocks: unknown; fallback: string }

export default function ChatBlocks({ blocks, fallback }: ChatBlocksProps) {
  const parsed = useChatBlocks(blocks)
  const unsupported = Array.isArray(blocks) && blocks.length > (parsed?.length ?? 0)
  if (!parsed) return <>{fallback && <p>{fallback}</p>}{unsupported && <p role="status">Parte da resposta não pôde ser exibida.</p>}</>
  return <div className="chat-blocks">{parsed.map(({ key, item: block }) => {
    switch (block.tipo) {
      case 'texto': return <p key={key}>{block.conteudo}</p>
      case 'grafico_barras': case 'grafico_linhas': case 'grafico_setores': case 'grafico_rosca': return <ChatBlockGraphic key={key} chart={block} />
      case 'tabela': case 'matriz_conformidade': return <DataTable key={key} block={block} />
      case 'indicadores': return <Indicators key={key} block={block} />
      case 'contexto_dados': return <DataContext key={key} block={block} />
      case 'ficha_usuario': return <UserProfile key={key} card={block} />
      case 'arquivo': return <ChatBlockFile key={key} file={block} />
      case 'galeria_usuarios': return <section className="chat-data-card" key={key}><h4>{block.titulo}</h4><div className="chat-gallery">{keyChatItems(block.imagens).map(({ key: personKey, item }) => <ChatBlockAvatar key={personKey} item={item} />)}</div></section>
    }
  })}{unsupported && <p role="status">Parte da resposta não pôde ser exibida.</p>}</div>
}
