import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

interface AstroChatTransitionProps {
  contentKey: string
  children: ReactNode
  className?: string
  inline?: boolean
}

// Preserva o conteúdo anterior apenas durante sua saída, sem atrasar a operação.
function AstroChatTransition({ contentKey, children, className = '', inline = false }: AstroChatTransitionProps) {
  const [current, setCurrent] = useState({ key: contentKey, children })
  const [previous, setPrevious] = useState<typeof current | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)
  const outgoingRef = useRef<HTMLElement | null>(null)
  const incomingRef = useRef<HTMLElement | null>(null)
  const Tag = inline ? 'span' : 'div'

  if (current.key !== contentKey) {
    setPrevious(current.children ? current : null)
    setCurrent({ key: contentKey, children })
  }

  useLayoutEffect(() => {
    const root = rootRef.current
    const outgoing = outgoingRef.current
    const incoming = incomingRef.current
    if (!root || !outgoing || !incoming) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animation = root.animate([
      { height: `${outgoing.offsetHeight}px` },
      { height: `${incoming.offsetHeight}px` },
    ], { duration: reduced ? 0 : 220, easing: 'cubic-bezier(.2,.8,.2,1)' })
    const finish = () => setPrevious(null)
    void animation.finished.then(finish, () => undefined)
    return () => animation.cancel()
  }, [contentKey])

  if (!children && !previous) return null

  return (
    <Tag className={`astro-chat-state ${className}`} ref={node => { rootRef.current = node }}>
      {previous && <Tag aria-hidden="true" className="astro-chat-state-out" inert ref={node => { outgoingRef.current = node }} key={`out-${previous.key}`}>
        {previous.children}
      </Tag>}
      <Tag className="astro-chat-state-in" ref={node => { incomingRef.current = node }} key={contentKey}>{children}</Tag>
    </Tag>
  )
}

export default AstroChatTransition
