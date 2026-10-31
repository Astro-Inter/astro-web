import { useChatBlocks } from '../../hooks/useChatBlocks'
import { keyChatItems } from '../../utils/chatBlocks'
import ChatBlockAvatar from '../chatBlockAvatar'
import ChatBlockGraphic from '../chatBlockGraphic'

interface ChatBlocksProps { blocks: unknown; fallback: string }
export default function ChatBlocks({ blocks, fallback }: ChatBlocksProps) {
  const parsed = useChatBlocks(blocks)
  if (!parsed) return <p>{fallback}</p>
  return <div className="chat-blocks">{parsed.map(({ key, item: block }) => {
    switch (block.tipo) {
      case 'texto': return <p key={key}>{block.conteudo}</p>
      case 'grafico_barras': case 'grafico_linhas': case 'grafico_setores': return <ChatBlockGraphic key={key} chart={block} />
      case 'tabela': return <section className="chat-data-card" key={key}><h4>{block.titulo}</h4>
        <div className="chat-table-scroll" role="region" aria-label={`Tabela: ${block.titulo}`} tabIndex={0}>
          <table><thead><tr>{block.colunas.map(column => <th scope="col" key={column.chave}>{column.titulo}</th>)}</tr></thead>
            <tbody>{keyChatItems(block.linhas).map(({ key: rowKey, item: row }) => <tr key={rowKey}>{block.colunas.map(column => <td key={column.chave}>{row[column.chave] ?? '—'}</td>)}</tr>)}</tbody>
          </table>
        </div><small>Página {block.pagina} de {block.total_paginas} · {block.total} resultado(s)</small>
      </section>
      case 'galeria_usuarios': return <section className="chat-data-card" key={key}><h4>{block.titulo}</h4><div className="chat-gallery">{keyChatItems(block.imagens).map(({ key: personKey, item }) => <ChatBlockAvatar key={personKey} item={item} />)}</div></section>
    }
  })}</div>
}
