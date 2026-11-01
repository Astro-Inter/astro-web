import { useState } from 'react'
import { useChatBlocks } from '../../hooks/useChatBlocks'
import { isChatImage, keyChatItems } from '../../utils/chatBlocks'
import type { ChatCell, ChatContextBlock, ChatIndicatorBlock, ChatSetSummary, ChatTableBlock, ChatUserCardBlock } from '../../types/chatBlocks'
import ChatBlockAvatar from '../chatBlockAvatar'
import ChatBlockGraphic from '../chatBlockGraphic'

export default function ChatBlocks({ blocks, fallback }: { blocks: unknown; fallback: string }) {
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
      case 'galeria_usuarios': return <section className="chat-data-card" key={key}><h4>{block.titulo}</h4><div className="chat-gallery">{keyChatItems(block.imagens).map(({ key: personKey, item }) => <ChatBlockAvatar key={personKey} item={item} />)}</div></section>
    }
  })}{unsupported && <p role="status">Parte da resposta não pôde ser exibida.</p>}</div>
}
function renderCell(value: ChatCell) {
  if (isChatImage(value)) return <ChatBlockAvatar item={{ nome: value.descricao.replace(/^Foto de /, ''), email: null, url: value.url }} />
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  return value ?? '—'
}
export function SetSummary({ summary, unit }: { summary: ChatSetSummary; unit?: string }) {
  return <div className="chat-set-summary">
    <p>Quantidade solicitada: {summary.solicitada}. Recebidos: {summary.retornada} de {summary.total}{unit ? ` ${unit}` : ' registros disponíveis'}.</p>
    <p>{summary.tem_mais ? 'Há registros autorizados além dos recebidos.' : 'Todos os registros disponíveis foram recebidos.'}</p>
    {summary.limitado && <p role="note">Pedido limitado por segurança: {summary.motivo_limite === 'maximo_resultados' ? 'máximo de 200 resultados' : 'tamanho da resposta'}.</p>}
    {!summary.limitado && <p>Quantidade solicitada atendida dentro dos dados disponíveis, sem corte de segurança.</p>}
    {summary.retornada === 0 && summary.total > 0 && <p>Nenhuma linha recebida; existem registros disponíveis. Este conjunto não está vazio.</p>}
  </div>
}
function DataTable({ block }: { block: ChatTableBlock }) {
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
function Indicators({ block }: { block: ChatIndicatorBlock }) {
  return <section className="chat-data-card"><h4>{block.titulo}</h4><p>Abrangência: conjunto autorizado.</p><p>{block.universo}</p>
    <dl className="chat-indicators">{block.indicadores.map(item => <div key={item.chave}>
      <dt>{item.rotulo}</dt><dd><strong>{item.valor === null ? 'Sem base' : item.valor.toLocaleString('pt-BR')}{item.valor !== null && item.unidade === '%' ? '%' : ''}</strong>
        <span>{item.unidade === 'pares_pessoa_nr' ? 'pares pessoa/NR' : item.unidade === '%' ? 'percentual' : item.unidade}</span>
        {item.denominador !== null && <small>Numerador: {item.numerador} · Denominador: {item.denominador}</small>}
        <small>{item.criterio}</small></dd>
    </div>)}</dl>
  </section>
}
function DataContext({ block }: { block: ChatContextBlock }) {
  return <section className="chat-data-card chat-data-context" aria-label="Contexto dos dados">
    <h4>Contexto dos dados</h4><p>Fonte: {block.fonte}{block.referencia ? ` · Referência: ${block.referencia}` : ''}</p>
    {block.inicio && block.fim && <p>Período: {block.inicio} a {block.fim}</p>}<p>Escopo: {block.escopo}</p>
    {Object.keys(block.filtros).length > 0 && <dl>{Object.entries(block.filtros).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(', ') : value === null ? '—' : typeof value === 'boolean' ? value ? 'Sim' : 'Não' : String(value)}</dd></div>)}</dl>}
    {block.criterios.length > 0 && <><h5>Critérios</h5><ul>{block.criterios.map((item, i) => <li key={i}>{item}</li>)}</ul></>}
    {block.avisos.length > 0 && <div role="note"><h5>Avisos</h5><ul>{block.avisos.map((item, i) => <li key={i}>{item}</li>)}</ul></div>}
    <SetSummary summary={block.conjunto} unit={block.conjunto.unidade_total} />
  </section>
}
function UserProfile({ card }: { card: ChatUserCardBlock }) {
  const compliance = card.conformidade
  return <section className="chat-data-card chat-user-card" aria-label={card.titulo}>
    <h4>{card.titulo}</h4><div className="chat-user-card-body">
      <ChatBlockAvatar item={{ nome: card.nome || '', email: card.email ?? null, url: card.foto?.url ?? null }} />
      <dl>{[['Nome', card.nome], ['E-mail', card.email], ['Cargo', card.cargo], ['Unidade', card.unidade], ['Perfil', card.perfil], ['Modalidade', card.modalidade], ['Situação', card.situacao]].map(([label, value]) => value && <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
    {compliance && <div className="chat-user-compliance"><strong>Conformidade cadastral: {compliance.percentual === null ? 'Sem NRs aplicáveis' : `${compliance.percentual.toLocaleString('pt-BR')}%`}</strong>
      {compliance.percentual !== null && <meter min="0" max="100" value={compliance.percentual} aria-label="Conformidade cadastral" />}
      <small>{compliance.vigentes} de {compliance.total} NRs vigentes. {compliance.criterio}{compliance.data_referencia ? ` · Referência: ${compliance.data_referencia}` : ''}</small>
    </div>}
  </section>
}
