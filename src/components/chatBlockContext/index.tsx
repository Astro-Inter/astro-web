import type { ChatContextBlock } from '../../types/chatBlocks'
import { keyChatItems } from '../../utils/chatBlocks'
import SetSummary from '../chatBlockSetSummary'

interface DataContextProps { block: ChatContextBlock }
export default function DataContext({ block }: DataContextProps) {
  return <section className="chat-data-card chat-data-context" aria-label="Contexto dos dados">
    <h4>Contexto dos dados</h4><p>Fonte: {block.fonte}{block.referencia ? ` · Referência: ${block.referencia}` : ''}</p>
    {block.inicio && block.fim && <p>Período: {block.inicio} a {block.fim}</p>}<p>Escopo: {block.escopo}</p>
    {Object.keys(block.filtros).length > 0 && <dl>{Object.entries(block.filtros).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(', ') : value === null ? '—' : typeof value === 'boolean' ? value ? 'Sim' : 'Não' : String(value)}</dd></div>)}</dl>}
    {block.criterios.length > 0 && <><h5>Critérios</h5><ul>{keyChatItems(block.criterios).map(({ key, item }) => <li key={key}>{item}</li>)}</ul></>}
    {block.avisos.length > 0 && <div role="note"><h5>Avisos</h5><ul>{keyChatItems(block.avisos).map(({ key, item }) => <li key={key}>{item}</li>)}</ul></div>}
    <SetSummary summary={block.conjunto} unit={block.conjunto.unidade_total} />
  </section>
}
