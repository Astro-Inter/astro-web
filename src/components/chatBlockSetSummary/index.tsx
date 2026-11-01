import type { ChatSetSummary } from '../../types/chatBlocks'

interface SetSummaryProps { summary: ChatSetSummary; unit?: string }
export default function SetSummary({ summary, unit }: SetSummaryProps) {
  return <div className="chat-set-summary">
    <p>Quantidade solicitada: {summary.solicitada}. Recebidos: {summary.retornada} de {summary.total}{unit ? ` ${unit}` : ' registros disponíveis'}.</p>
    <p>{summary.tem_mais ? 'Há registros autorizados além dos recebidos.' : 'Todos os registros disponíveis foram recebidos.'}</p>
    {summary.limitado && <p role="note">Pedido limitado por segurança: {summary.motivo_limite === 'maximo_resultados' ? 'máximo de 200 resultados' : 'tamanho da resposta'}.</p>}
    {!summary.limitado && <p>Quantidade solicitada atendida dentro dos dados disponíveis, sem corte de segurança.</p>}
    {summary.retornada === 0 && summary.total > 0 && <p>Nenhuma linha recebida; existem registros disponíveis. Este conjunto não está vazio.</p>}
  </div>
}
