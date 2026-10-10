import { useEffect, useState } from 'react'
import type { ChatMessage } from '../../types/chat'
import AstroChatLoading from '../astroChatLoading'
import AstroChatTransition from '../astroChatTransition'

interface AstroChatMessagesProps {
  messages: ChatMessage[]
  thinkingId: string | null
}

function AstroChatMessages({ messages, thinkingId }: AstroChatMessagesProps) {
  const ids = messages.map(message => message.id).join(',')
  const [present, setPresent] = useState({ ids, messages, removed: [] as ChatMessage[] })
  if (present.ids !== ids) {
    const retained = new Set(messages.map(message => message.id))
    setPresent({ ids, messages, removed: [...present.removed, ...present.messages].filter(message => !retained.has(message.id)) })
  }

  useEffect(() => {
    if (present.removed.length === 0) return
    const timeout = window.setTimeout(() => setPresent(current => ({ ...current, removed: [] })),
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240)
    return () => window.clearTimeout(timeout)
  }, [present.removed])

  return (
    <div aria-live="polite" className="astro-chat-messages" role="log">
      {[...messages, ...present.removed].map(message => {
        const removed = present.removed.some(item => item.id === message.id)
        const thinking = message.id === thinkingId
        return <AstroChatTransition className="astro-chat-message-slot" contentKey={removed ? 'removed' : thinking ? 'thinking' : `message-${message.text}`} key={message.id}>
          {removed ? null : <div className={`astro-chat-message astro-chat-message--${message.author}`}>
            {message.author === 'astro' && <img alt="" aria-hidden="true" height="80" src={import.meta.env.BASE_URL + 'chatAvatarRobot.png'} width="80" />}
            <div className="astro-chat-message-content">
              {thinking ? <AstroChatLoading className="astro-chat-typing" dots hideLabel label="A IA está preparando uma resposta…" /> : <p>{message.text}</p>}
            </div>
          </div>}
        </AstroChatTransition>
      })}
    </div>
  )
}

export default AstroChatMessages
