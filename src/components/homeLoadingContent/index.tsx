import type { ReactNode } from 'react'
import { useExitPresence } from '../../hooks/useExitPresence'

interface HomeLoadingContentProps {
  loading: boolean
  skeleton: ReactNode
  children: ReactNode
  contentKey?: string
  inline?: boolean
}

export default function HomeLoadingContent({ loading, skeleton, children, contentKey = 'ready', inline = false }: HomeLoadingContentProps) {
  const presence = useExitPresence(true, loading)
  const Tag = inline ? 'span' : 'div'
  return <Tag className="home-data-transition" aria-busy={loading}>
    {presence.present
      ? <Tag aria-hidden="true" className={`home-data-skeleton${presence.exiting ? ' home-data-skeleton--exiting' : ''}`}>{skeleton}</Tag>
      : <Tag className="home-data-ready" key={contentKey}>{children}</Tag>}
  </Tag>
}
