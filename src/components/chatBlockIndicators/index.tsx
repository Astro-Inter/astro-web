import type { ChatIndicatorBlock } from '../../types/chatBlocks'

interface IndicatorsProps { block: ChatIndicatorBlock }
export default function Indicators({ block }: IndicatorsProps) {
  return <section className="chat-data-card"><h4>{block.titulo}</h4><p>Abrangência: conjunto autorizado.</p><p>{block.universo}</p>
    <dl className="chat-indicators">{block.indicadores.map(item => <div key={item.chave}>
      <dt>{item.rotulo}</dt><dd><strong>{item.valor === null ? 'Sem base' : item.valor.toLocaleString('pt-BR')}{item.valor !== null && item.unidade === '%' ? '%' : ''}</strong>
        <span>{item.unidade === 'pares_pessoa_nr' ? 'pares pessoa/NR' : item.unidade === '%' ? 'percentual' : item.unidade}</span>
        {item.denominador !== null && <small>Numerador: {item.numerador} · Denominador: {item.denominador}</small>}
        <small>{item.criterio}</small></dd>
    </div>)}</dl>
  </section>
}
