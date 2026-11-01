import { useState } from 'react'
import type { ChatGalleryPerson } from '../../types/chatBlocks'
import { safeChatImage } from '../../utils/chatBlocks'

interface ChatBlockAvatarProps { item: ChatGalleryPerson; showName?: boolean }
export default function ChatBlockAvatar({ item, showName = true }: ChatBlockAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const url = safeChatImage(item.url)
  return <div className="chat-gallery-person">
    {url && failedUrl !== url ? <img src={url} alt={`Foto de ${item.nome}`} referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
      : <span aria-hidden="true">{item.nome.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'}</span>}
    {showName && <strong>{item.nome || 'Meu perfil'}</strong>}
  </div>
}
