import { useState } from 'react'
import type { ChatCell, ChatTableBlock } from '../../types/chatBlocks'
import { isChatImage, keyChatItems } from '../../utils/chatBlocks'
import ChatBlockAvatar from '../chatBlockAvatar'
import SetSummary from '../chatBlockSetSummary'

interface DataTableProps { block: ChatTableBlock }
function renderCell(value: ChatCell) {
  if (isChatImage(value)) return <ChatBlockAvatar item={{ nome: value.descricao.replace(/^Foto de /, ''), email: null, url: value.url }} />
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return value ?? '—'
}
export default function DataTable({ block }: DataTableProps) {
  const [page, setPage] = useState(1)
  const local = 'paginacao' in block && block.paginacao === 'local'
  const pages = Math.max(1, Math.ceil(block.linhas.length / 10))
  const current = Math.min(page, pages)
  const rows = local ? block.linhas.slice((current - 1) * 10, current * 10) : block.linhas
  return <section className="chat-data-card"><h4>{block.titulo}</h4>
    <div className="chat-table-scroll" role="region" aria-label={`Tabela: ${block.titulo}`} tabIndex={0}>
      <table><thead><tr>{block.colunas.map(column => <th scope="col" key={column.chave}>{column.titulo}</th>)}</tr></thead>
        <tbody>{keyChatItems(rows).map(({ key, item: row }) => <tr key={block.tipo === 'matriz_conformidade' ? `${row.referencia_pessoa}:${row.nr}` : key}>{block.colunas.map(column => <td key={column.chave}>{renderCell(row[column.chave])}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {local ? <><nav className="chat-local-pagination" aria-label={`Paginação: ${block.titulo}`}>
      <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)}>Anterior</button>
      <span aria-live="polite">Página {current} de {pages}</span>
      <button type="button" disabled={current === pages} onClick={() => setPage(current + 1)}>Próxima</button>
    </nav><SetSummary summary={block} /></> : <small>Página {block.pagina} de {block.total_paginas} · {block.total} resultado(s)</small>}
  </section>
}
