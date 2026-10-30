import { useState } from 'react'
import './style.css'

type Point = { categoria: string; valor: number }
type Chart = { tipo: 'grafico_barras' | 'grafico_linhas' | 'grafico_setores'; versao: 1; titulo: string; fonte: string; unidade: string; dados: Point[] }
type Table = { tipo: 'tabela'; versao: 1; titulo: string; colunas: { chave: string; titulo: string }[]; linhas: Record<string, string | number | null>[]; pagina: number; total_paginas: number; total: number }
type Gallery = { tipo: 'galeria_usuarios'; versao: 1; titulo: string; imagens: { nome: string; email: string | null; url: string | null }[] }
type Block = { tipo: 'texto'; conteudo: string } | Chart | Table | Gallery
const text = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 6000
const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const list = (x: unknown, max: number): x is unknown[] => Array.isArray(x) && x.length > 0 && x.length <= max

export function parseBlocks(value: unknown): Block[] | null {
  if (!list(value, 10)) return null
  for (const b of value) {
    if (!object(b)) return null
    if (b.tipo === 'texto') { if (!text(b.conteudo)) return null; continue }
    if (b.versao !== 1 || !text(b.titulo)) return null
    if (b.tipo === 'grafico_barras' || b.tipo === 'grafico_linhas' || b.tipo === 'grafico_setores') {
      if (!text(b.fonte) || !text(b.unidade) || !list(b.dados, 12) || !b.dados.every(p => object(p) && text(p.categoria) && typeof p.valor === 'number' && Number.isFinite(p.valor) && p.valor >= 0)) return null
    } else if (b.tipo === 'tabela') {
      if (!list(b.colunas, 10) || !b.colunas.every(c => object(c) && text(c.chave) && /^[a-z][a-z0-9_]{0,39}$/.test(c.chave) && text(c.titulo)) || !list(b.linhas, 50) || !b.linhas.every(r => object(r) && b.colunas instanceof Array && b.colunas.every(c => object(c) && typeof c.chave === 'string' && (r[c.chave] === null || typeof r[c.chave] === 'string' || typeof r[c.chave] === 'number')))) return null
    } else if (b.tipo === 'galeria_usuarios') {
      if (!list(b.imagens, 50) || !b.imagens.every(i => object(i) && text(i.nome) && (i.url === null || typeof i.url === 'string'))) return null
    } else return null
  }
  return value as Block[]
}
function safeImage(value: string | null): string | undefined {
  try { if (!value) return; const u = new URL(value); if (u.protocol === 'https:' && !u.username && !u.password && u.hostname.endsWith('.r2.cloudflarestorage.com')) return u.href } catch { /* usa iniciais */ }
}
function Avatar({ item }: { item: Gallery['imagens'][number] }) {
  const [failed, setFailed] = useState(false)
  const url = safeImage(item.url)
  return <div className="chat-gallery-person">{url && !failed ? <img src={url} alt={`Foto de ${item.nome}`} referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span aria-hidden="true">{item.nome.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()}</span>}<strong>{item.nome}</strong></div>
}
const colors = ['#C4A8E0', '#8A63B1', '#B68CCC', '#641A91', '#D4C0E8', '#72529E', '#4D327A'].map((color, index) => `var(--analytics-series-${index + 1}, ${color})`)

function pieSlices(data: Point[], total: number): string {
  let offset = 0
  return data.map((point, index) => {
    const start = offset
    offset += total ? point.valor / total * 100 : 0
    return `${colors[index % colors.length]} ${start}% ${offset}%`
  }).join(', ')
}
function Graphic({ chart }: { chart: Chart }) {
  const max = Math.max(1, ...chart.dados.map(p => p.valor)), total = chart.dados.reduce((n, p) => n + p.valor, 0)
  const slices = pieSlices(chart.dados, total)
  const points = chart.dados.map((p, i) => `${chart.dados.length === 1 ? 50 : 5 + i * 90 / (chart.dados.length - 1)},${90 - p.valor / max * 75}`).join(' ')
  return <figure className="chat-data-card"><figcaption>{chart.titulo}</figcaption>
    {chart.tipo === 'grafico_barras' && <div className="chat-bars" aria-hidden="true">{chart.dados.map((p, i) => <div key={i}><span style={{ height: `${Math.max(p.valor ? 4 : 0, p.valor / max * 100)}%`, background: colors[i % colors.length] }} /></div>)}</div>}
    {chart.tipo === 'grafico_linhas' && <svg className="chat-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line x1="5" y1="90" x2="95" y2="90" stroke="#d9d2ed" strokeWidth="1"/><polyline points={points} fill="none" stroke="var(--analytics-series-1, #C4A8E0)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>}
    {chart.tipo === 'grafico_setores' && <div className="chat-pie" aria-hidden="true" style={{ background: total ? `conic-gradient(${slices})` : '#e9e5f1' }} />}
    <ul className="chat-chart-values">{chart.dados.map((p, i) => <li key={i}><span><i style={{ background: colors[i % colors.length] }} />{p.categoria}</span><strong>{p.valor}{chart.tipo === 'grafico_setores' && total ? ` (${(100 * p.valor / total).toFixed(1)}%)` : ''}</strong></li>)}</ul><small>{chart.fonte} · {chart.unidade}</small></figure>
}
export default function ChatBlocks({ blocks, fallback }: { blocks: unknown; fallback: string }) {
  const parsed = parseBlocks(blocks)
  if (!parsed) return <p>{fallback}</p>
  return <div className="chat-blocks">{parsed.map((b, i) => b.tipo === 'texto' ? <p key={i}>{b.conteudo}</p> : b.tipo.startsWith('grafico_') ? <Graphic key={i} chart={b as Chart} /> : b.tipo === 'tabela' ? <section className="chat-data-card" key={i}><h4>{b.titulo}</h4><div className="chat-table-scroll"><table><thead><tr>{b.colunas.map(c => <th scope="col" key={c.chave}>{c.titulo}</th>)}</tr></thead><tbody>{b.linhas.map((r, n) => <tr key={n}>{b.colunas.map(c => <td key={c.chave}>{r[c.chave] ?? '—'}</td>)}</tr>)}</tbody></table></div><small>Página {b.pagina} de {b.total_paginas} · {b.total} resultado(s)</small></section> : b.tipo === 'galeria_usuarios' ? <section className="chat-data-card" key={i}><h4>{b.titulo}</h4><div className="chat-gallery">{b.imagens.map((item, n) => <Avatar key={`${i}-${n}`} item={item} />)}</div></section> : null)}</div>
}
