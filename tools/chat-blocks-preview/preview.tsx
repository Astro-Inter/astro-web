import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import ChatBlocks from '../../src/components/chatBlocks'
import '../../styles/chatBlocks.css'
import './preview.css'
import fixture from './fixture.json'
export default function Preview() {
  const [visible, setVisible] = useState(true)
  const [snapshot, setSnapshot] = useState(0)
  return <main><h1>Blocos do chatbot</h1><p>Simulação local · dados fictícios · sem chamadas à API</p><button onClick={() => setVisible(!visible)}>{visible ? 'Fechar histórico' : 'Reabrir histórico'}</button><button onClick={() => setSnapshot(snapshot + 1)}>Nova resposta</button>
    {visible && <ChatBlocks key={snapshot} blocks={fixture} fallback="" />}
  </main>
}
createRoot(document.getElementById('root')!).render(<Preview />)
