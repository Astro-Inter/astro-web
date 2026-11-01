import type { ChatChartBlock } from '../../types/chatBlocks'
import { keyChatItems } from '../../utils/chatBlocks'

interface ChatBlockGraphicProps { chart: ChatChartBlock }
const colors = ['#C4A8E0', '#8A63B1', '#B68CCC', '#641A91', '#D4C0E8', '#72529E', '#4D327A'].map((color, index) => `var(--analytics-series-${index + 1}, ${color})`)

export default function ChatBlockGraphic({ chart }: ChatBlockGraphicProps) {
  const max = Math.max(1, ...chart.dados.map(point => point.valor))
  const total = chart.dados.reduce((sum, point) => sum + point.valor, 0)
  const items = keyChatItems(chart.dados)
  const slices = chart.dados.map((point, index) => {
    const start = total ? chart.dados.slice(0, index).reduce((sum, item) => sum + item.valor, 0) / total * 100 : 0
    const end = start + (total ? point.valor / total * 100 : 0)
    return `${colors[index % colors.length]} ${start}% ${end}%`
  }).join(', ')
  const points = chart.dados.map((point, index) => `${chart.dados.length === 1 ? 50 : 5 + index * 90 / (chart.dados.length - 1)},${90 - point.valor / max * 75}`).join(' ')
  const circular = chart.tipo === 'grafico_setores' || chart.tipo === 'grafico_rosca'
  return <figure className="chat-data-card"><figcaption>{chart.titulo}</figcaption>
    {chart.tipo === 'grafico_barras' && <div className="chat-bars" aria-hidden="true">{items.map(({ key, item }, index) => <div key={key} title={`${item.categoria}: ${item.valor} ${chart.unidade}`}><span style={{ height: `${Math.max(item.valor ? 4 : 0, item.valor / max * 100)}%`, background: colors[index % colors.length] }} /></div>)}</div>}
    {chart.tipo === 'grafico_linhas' && <svg className="chat-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="5" y1="90" x2="95" y2="90" stroke="#d9d2ed" strokeWidth="1" /><polyline points={points} fill="none" stroke="var(--analytics-series-1, #C4A8E0)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>}
    {circular && (total > 0 ? <div className={`chat-pie${chart.tipo === 'grafico_rosca' ? ' chat-pie--donut' : ''}`} aria-hidden="true" style={{ background: `conic-gradient(${slices})` }} /> : <p>Sem valores para distribuir</p>)}
    <ul className="chat-chart-values">{items.map(({ key, item }, index) => <li key={key} title={`${item.categoria}: ${item.valor} ${chart.unidade}`}><span><i aria-hidden="true" style={{ background: colors[index % colors.length] }} />{item.categoria}</span><strong>{item.valor}{chart.tipo === 'grafico_setores' && total ? ` (${(100 * item.valor / total).toFixed(1)}%)` : ''}</strong></li>)}</ul>
    <small>{chart.fonte} · {chart.unidade}</small>
  </figure>
}
