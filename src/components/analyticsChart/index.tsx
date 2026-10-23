import { useEffect, useId, useMemo, useRef, useState, type PointerEvent } from 'react'
import type { AnalyticsChart as Chart, ChartKind } from '../../types/dashboard'
import { dimensionLabels } from '../../data/dashboardCatalog'

const colors = ['#C4A8E0', '#8A63B1', '#B68CCC', '#641A91', '#D4C0E8', '#72529E', '#4D327A']
const dashes = ['', '9 4', '3 4', '12 4 3 4', '2 3', '8 3 2 3', '14 5']
const number = new Intl.NumberFormat('pt-BR')
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
function label(value: string | number, dimension: string): string {
  const text = String(value)
  return dimension === 'data' && /^\d{4}-\d{2}-\d{2}$/.test(text) ? text.split('-').reverse().join('/') : text
}
interface Zoom { start: number; end: number; min: number; max: number }
interface Drag { x: number; y: number; toX: number; toY: number; pan: boolean }
interface Hover { index: number; x: number; y: number }

function InteractiveChart({ chart, kind }: { chart: Chart; kind: ChartKind }) {
  const id = useId()
  const plot = useRef<HTMLDivElement>(null)
  const [plotSize, setPlotSize] = useState(900)
  useEffect(() => {
    if (!plot.current) return
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width
      if (width) setPlotSize(Math.max(240, Math.round(width)))
    })
    observer.observe(plot.current)
    return () => observer.disconnect()
  }, [kind])
  const axis = chart.dimensions[0], seriesField = chart.dimensions[1]
  const metricName = chart.metricLabel || 'Quantidade'
  const formatValue = (value: number) => `${number.format(value)}${chart.format === 'percent' ? '%' : ''}`
  const { categories, series, values } = useMemo(() => ({
    categories: [...new Set(chart.rows.map(row => String(row[axis])))],
    series: seriesField ? [...new Set(chart.rows.map(row => String(row[seriesField])))] : [metricName],
    values: new Map(chart.rows.map(row => [JSON.stringify([String(row[axis]), seriesField ? String(row[seriesField]) : metricName]), Number(row[chart.measure])])),
  }), [chart, axis, seriesField, metricName])
  const [hidden, setHidden] = useState<string[]>([])
  const [zoom, setZoom] = useState<Zoom | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const start = zoom?.start ?? 0, end = zoom?.end ?? categories.length - 1
  const shownCategories = categories.slice(start, end + 1)
  const visibleSeries = series.filter(name => !hidden.includes(name))
  const active = visibleSeries.length ? visibleSeries : series
  const getValue = (category: string, name: string) => values.get(JSON.stringify([category, name]))
  const categorySet = new Set(shownCategories), activeSet = new Set(active)
  const maximum = chart.rows.reduce((highest, row) => categorySet.has(String(row[axis])) && (!seriesField || activeSet.has(String(row[seriesField]))) ? Math.max(highest, Number(row[chart.measure])) : highest, 1)
  const niceMax = Math.ceil(maximum / (10 ** Math.floor(Math.log10(maximum)))) * 10 ** Math.floor(Math.log10(maximum))
  const lowest = chart.rows.reduce((value, row) => categorySet.has(String(row[axis])) && (!seriesField || activeSet.has(String(row[seriesField]))) ? Math.min(value, Number(row[chart.measure])) : value, 0)
  const min = zoom?.min ?? Math.floor(lowest), max = zoom?.max ?? niceMax
  const width = plotSize, height = 300, left = 48, right = 30, top = 24, bottom = 58
  const axisLabel = (value: string) => {
    const full = label(value, axis)
    if (width < 400 && axis === 'data' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(8)}/${value.slice(5, 7)}/${value.slice(2, 4)}`
    return full.length > 18 ? `${full.slice(0, 16)}…` : full
  }
  const plotWidth = width - left - right, plotHeight = height - top - bottom
  const x = (index: number) => left + (index + .5) * plotWidth / shownCategories.length
  const y = (value: number) => top + plotHeight * (1 - (value - min) / (max - min))
  const fromY = (pixel: number) => min + (1 - (pixel - top) / plotHeight) * (max - min)
  const indexAt = (pixel: number) => Math.max(start, Math.min(end, start + Math.floor((pixel - left) / plotWidth * shownCategories.length)))
  const color = (name: string) => colors[series.indexOf(name) % colors.length]
  const tickCount = Math.min(shownCategories.length, Math.max(2, Math.floor(plotWidth / 135)))
  const labelIndices = new Set(Array.from({ length: tickCount }, (_, tick) => Math.round(tick * (shownCategories.length - 1) / Math.max(1, tickCount - 1))))
  const total = chart.rows.reduce((sum, row) => sum + Number(row[chart.measure]), 0)
  let cumulative = 0
  function coordinates(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: Math.max(left, Math.min(width - right, (event.clientX - rect.left) * width / rect.width)), y: Math.max(top, Math.min(height - bottom, (event.clientY - rect.top) * height / rect.height)) }
  }
  function inspect(event: PointerEvent<SVGSVGElement>) {
    const point = coordinates(event)
    setHover({ index: indexAt(point.x), x: point.x / width * 100, y: point.y / height * 100 })
  }
  function finishDrag(event: PointerEvent<SVGSVGElement>) {
    const current = dragRef.current
    if (!current) return
    const point = coordinates(event)
    const dx = point.x - current.x, dy = point.y - current.y
    dragRef.current = null; setDrag(null)
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) { inspect(event); return }
    if (current.pan && zoom) {
      const count = end - start + 1
      const shift = Math.round(-dx / plotWidth * count)
      const next = Math.max(0, Math.min(categories.length - count, start + shift))
      const yShift = dy / plotHeight * (max - min)
      const nextMin = min + yShift
      setZoom({ start: next, end: next + count - 1, min: nextMin, max: nextMin + max - min })
    } else {
      const first = Math.abs(dx) >= 8 ? indexAt(Math.min(current.x, point.x)) : start
      const last = Math.abs(dx) >= 8 ? indexAt(Math.max(current.x, point.x)) : end
      const nextMin = Math.abs(dy) >= 8 ? fromY(Math.max(current.y, point.y)) : min
      const nextMax = Math.abs(dy) >= 8 ? fromY(Math.min(current.y, point.y)) : max
      setZoom({ start: first, end: last, min: nextMin, max: Math.max(nextMin + 1, nextMax) })
    }
    setHover(null)
  }
  function resetZoom() { setZoom(null); setHover(null); dragRef.current = null; setDrag(null) }
  return <div className="analytics-chart-body">
    {kind === 'pie' && chart.rows.length <= 20 ? total === 0 ? <p className="analytics-empty">Não há participações para representar nesta distribuição.</p> : <div className="analytics-pie-layout">
      <svg viewBox="0 0 240 240" role="img" aria-labelledby={id} className="analytics-pie"><title id={id}>{chart.title}. Distribuição por {dimensionLabels[axis] || axis}.</title>
        {chart.rows.map((row, index) => {
          const value = Number(row[chart.measure])
          if (!value) return null
          const a = cumulative / total * Math.PI * 2 - Math.PI / 2
          cumulative += value
          const b = cumulative / total * Math.PI * 2 - Math.PI / 2
          const title = `${label(row[axis], axis)}: ${formatValue(value)} (${(value / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)`
          return value === total ? <circle key={index} cx="120" cy="120" r="108" fill={colors[index % colors.length]}><title>{title}</title></circle> : <path key={index} d={`M120,120 L${120 + 108 * Math.cos(a)},${120 + 108 * Math.sin(a)} A108,108 0 ${b - a > Math.PI ? 1 : 0} 1 ${120 + 108 * Math.cos(b)},${120 + 108 * Math.sin(b)} Z`} fill={colors[index % colors.length]} stroke="#D4C0E8" strokeWidth="1.5"><title>{title}</title></path>
        })}
      </svg>
      <ul className="analytics-legend analytics-legend--vertical">{chart.rows.map((row, index) => <li key={index}><i style={{ background: colors[index % colors.length] }} />{label(row[axis], axis)}<strong>{formatValue(Number(row[chart.measure]))}</strong></li>)}</ul>
    </div> : <>
      {kind === 'pie' && <p className="analytics-note">Há mais de 20 categorias. A distribuição está em barras para facilitar a leitura.</p>}
      <div className="analytics-interactive-plot" ref={plot} onPointerLeave={() => { if (!dragRef.current) setHover(null) }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHover(null) }}>
        {zoom && <button type="button" className="analytics-clear-zoom" onClick={resetZoom} aria-label={`Limpar zoom de ${chart.title}`}>Limpar zoom</button>}
        <svg viewBox={`0 0 ${width} ${height}`} className={`analytics-plot${drag?.pan ? ' analytics-plot--panning' : ''}`} role="img" tabIndex={0} aria-labelledby={id} aria-describedby={`${id}-help`} aria-details={hover ? `${id}-tooltip` : undefined}
          onPointerMove={event => {
            if (dragRef.current) { const point = coordinates(event); const next = { ...dragRef.current, toX: point.x, toY: point.y }; dragRef.current = next; setDrag(next) }
            else if (event.pointerType === 'mouse') inspect(event)
          }}
          onPointerDown={event => {
            if (event.button !== 0) return
            event.preventDefault()
            event.currentTarget.focus({ preventScroll: true })
            const point = coordinates(event)
            const next = { ...point, toX: point.x, toY: point.y, pan: event.shiftKey && !!zoom }
            dragRef.current = next; setDrag(next); setHover(null); event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerUp={finishDrag}
          onPointerCancel={() => { dragRef.current = null; setDrag(null) }}
          onLostPointerCapture={() => { dragRef.current = null; setDrag(null) }}
          onDoubleClick={resetZoom}
          onFocus={() => setHover({ index: start, x: x(0) / width * 100, y: 35 })}
          onKeyDown={event => {
            if (event.key === 'Escape') { setHover(null); dragRef.current = null; setDrag(null); return }
            if (event.key === '0') { event.preventDefault(); resetZoom(); return }
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const index = event.key === 'Home' ? start : event.key === 'End' ? end : Math.max(start, Math.min(end, (hover?.index ?? start) + (event.key === 'ArrowLeft' ? -1 : 1)))
            setHover({ index, x: x(index - start) / width * 100, y: 35 })
          }}>
          <title id={id}>{chart.title}. Arraste para ampliar uma área e passe o mouse para consultar os valores.</title>
          <defs><clipPath id={`${id}-clip`}><rect x={left - 7} y={top - 7} width={plotWidth + 14} height={plotHeight + 14} /></clipPath></defs>
          {[0, 1, 2, 3, 4].map(tick => { const value = min + (max - min) * tick / 4; return <g key={tick}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className="analytics-gridline" /><text x={left - 10} y={y(value) + 5} textAnchor="end">{compact.format(value)}{chart.format === 'percent' ? '%' : ''}</text></g> })}
          {shownCategories.map((category, index) => labelIndices.has(index) && <text key={category} x={x(index)} y={height - bottom + 28} textAnchor="middle"><title>{label(category, axis)}</title>{axisLabel(category)}</text>)}
          <g clipPath={`url(#${id}-clip)`}>
            {active.map(name => {
              const seriesIndex = series.indexOf(name)
              const points = shownCategories.map((category, index) => ({ category, index, value: getValue(category, name) }))
              if (kind !== 'line') {
                const barWidth = Math.min(65, plotWidth / shownCategories.length * .72 / active.length)
                return <g key={name}>{points.map(point => point.value !== undefined && <rect key={point.category} x={x(point.index) - barWidth * active.length / 2 + barWidth * active.indexOf(name)} y={Math.min(y(0), y(point.value))} width={Math.max(.5, barWidth - 2)} height={Math.abs(y(0) - y(point.value))} rx="2" fill={color(name)} stroke="#D4C0E8" strokeWidth="1" />)}</g>
              }
              let pen = false
              const path = points.map(point => { if (point.value === undefined) { pen = false; return '' }; const part = `${pen ? 'L' : 'M'}${x(point.index)},${y(point.value)}`; pen = true; return part }).join(' ')
              return <g key={name}><path d={path} fill="none" stroke="#D4C0E8" strokeWidth="4" strokeDasharray={dashes[seriesIndex % dashes.length]} strokeLinejoin="round" /><path d={path} fill="none" stroke={color(name)} strokeWidth="2.5" strokeDasharray={dashes[seriesIndex % dashes.length]} strokeLinejoin="round" />{points.map(point => point.value !== undefined && <circle key={point.category} cx={x(point.index)} cy={y(point.value)} r={hover?.index === start + point.index ? 5.5 : 3} fill={color(name)} stroke="#D4C0E8" strokeWidth="1.3" />)}</g>
            })}
            {hover && <line x1={x(hover.index - start)} x2={x(hover.index - start)} y1={top} y2={height - bottom} className="analytics-crosshair" />}
            {drag && !drag.pan && <rect x={Math.min(drag.x, drag.toX)} y={Math.min(drag.y, drag.toY)} width={Math.abs(drag.toX - drag.x)} height={Math.abs(drag.toY - drag.y)} className="analytics-zoom-selection" />}
          </g>
        </svg>
        {hover && <div id={`${id}-tooltip`} role="tooltip" className={`analytics-chart-tooltip${hover.y > 55 ? ' analytics-chart-tooltip--above' : ''}`} style={{ left: `clamp(.5rem, calc(${hover.x}% + .75rem), max(.5rem, calc(100% - 17rem - .5rem)))`, top: `${Math.max(10, Math.min(90, hover.y))}%`, maxHeight: `${Math.max(64, Math.round((hover.y > 55 ? hover.y : 100 - hover.y) / 100 * height) - 24)}px` }}>
          <strong>{label(categories[hover.index], axis)}</strong>
          <ul>{active.map(name => <li key={name}><span><i style={{ background: color(name) }} />{name}</span><b>{getValue(categories[hover.index], name) === undefined ? 'Sem registro' : formatValue(getValue(categories[hover.index], name)!)}</b></li>)}</ul>
        </div>}
      </div>
      {seriesField && <div className="analytics-series-controls" aria-label="Séries do gráfico">{series.map(name => <button type="button" key={name} aria-pressed={active.includes(name)} disabled={active.includes(name) && active.length === 1} onClick={() => { setHidden(current => current.includes(name) ? current.filter(value => value !== name) : [...current, name]); setHover(null) }}><i style={{ background: color(name) }} />{name}</button>)}</div>}
      <p className="analytics-sr-only" id={`${id}-help`}>Passe o mouse ou toque para consultar data e quantidade. Arraste sobre o gráfico para ampliar uma área. Shift e arrastar move a área ampliada. Dois cliques ou a tecla zero limpam o zoom. As setas esquerda e direita consultam os períodos; Escape fecha a dica.</p>
      <span className="analytics-sr-only" role="status" aria-live="polite">{hover ? `${label(categories[hover.index], axis)}. ${active.map(name => `${name}: ${getValue(categories[hover.index], name) === undefined ? 'Sem registro' : formatValue(getValue(categories[hover.index], name)!)}`).join('. ')}` : ''}</span>
    </>}
    {!chart.dateSensitive && <p className="analytics-note">Este indicador mostra o estado disponível e não acompanha o filtro de datas.</p>}
    {!!chart.undefinedGroups && <p className="analytics-note">{chart.undefinedGroups} agrupamento(s) sem resultado, por ausência de valores ou divisão por zero.</p>}
  </div>
}

export default function AnalyticsChart({ chart, kind }: { chart: Chart; kind: ChartKind }) {
  if (!chart.rows.length) return <div className="analytics-chart-empty"><p>{chart.undefinedGroups ? 'O cálculo não tem resultado neste recorte.' : 'Sem dados para este período.'}</p><span>{chart.undefinedGroups ? 'Confira os valores disponíveis e se o divisor é diferente de zero.' : 'Experimente outras datas ou consulte uma visão diferente.'}</span></div>
  return <InteractiveChart key={`${chart.title}/${chart.rows.length}/${chart.rows[0]?.[chart.dimensions[0]]}/${chart.rows.at(-1)?.[chart.dimensions[0]]}`} chart={chart} kind={kind} />
}
