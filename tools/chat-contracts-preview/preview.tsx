import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import ChatBlocks from '../../src/components/chatBlocks'
import type { ChatBlock } from '../../src/types/chatBlocks'
import scenariosJson from './scenarios.json'
import '../../styles/chatBlocks.css'
import './preview.css'
interface Scenario { question: string; blocos?: unknown; error?: string; status?: number }
interface Message { id: number; question: string; blocks: unknown }
const scenarios: Record<string, Scenario> = scenariosJson
const originalFetch = window.fetch.bind(window)
// Apenas neste harness de desenvolvimento: transporte de arquivo fictício, sem API/LLM.
window.fetch = async (input, init) => {
  if (String(input).startsWith('https://files.example/')) {
    if (String(input).includes('falha')) return new Response('Indisponível', { status: 403 })
    const pdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 48>>stream\nBT /F1 14 Tf 20 200 Td (PDF ficticio PR34) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF'
    return new Response(pdf, { headers: { 'Content-Type': 'application/pdf' } })
  }
  return originalFetch(input, init)
}
export default function Preview() {
  const [state, setState] = useState({ messages: [] as Message[], error: '', history: false, next: 1 })
  function send(key: string) {
    const scenario = scenarios[key]
    if (scenario.error) { setState(current => ({ ...current, error: `${scenario.status}: ${scenario.error}` })); return }
    setState(current => ({ ...current, history: false, error: '', next: current.next + 1, messages: [...current.messages, { id: current.next, question: scenario.question, blocks: structuredClone(scenario.blocos) }] }))
  }
  function expireSoon() {
    const block = structuredClone(scenarios.pdf.blocos) as ChatBlock[]
    for (const file of block) if (file.tipo === 'arquivo') file.expira_em = new Date(Date.now() + 5000).toISOString()
    setState(current => ({ ...current, messages: [...current.messages, { id: current.next, question: 'Expiração em cinco segundos', blocks: block }], next: current.next + 1 }))
  }
  return <main><h1>Chat · contratos da PR 34</h1><p>SIMULAÇÃO LOCAL — dados fictícios, sem chamadas à API de IA. O PDF usa transporte simulado.</p>
    <details><summary>Perguntas simuladas</summary><div className="scenario-actions">{Object.entries(scenarios).map(([key, scenario]) => <button type="button" key={key} onClick={() => send(key)}>{scenario.question}</button>)}<button onClick={expireSoon}>PDF expira em 5 segundos</button></div></details>
    <nav aria-label="Controles da simulação"><button onClick={() => setState(current => ({ ...current, history: !current.history }))}>{state.history ? 'Reabrir histórico' : 'Fechar conversa'}</button><button onClick={() => setState({ messages: [], error: '', history: false, next: 1 })}>Nova conversa</button></nav>
    {state.error && <p role="alert">{state.error}</p>}
    {!state.history && <div className="messages" role="log">{state.messages.map(message => <article key={message.id}><p className="question">{message.question}</p><ChatBlocks blocks={message.blocks} fallback="" /></article>)}</div>}
  </main>
}
createRoot(document.getElementById('root')!).render(<Preview />)
