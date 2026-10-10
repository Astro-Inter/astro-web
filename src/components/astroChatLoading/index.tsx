interface AstroChatLoadingProps {
  label: string
  dots?: boolean
  hideLabel?: boolean
  className?: string
}

function AstroChatLoading({ label, dots = false, hideLabel = false, className = '' }: AstroChatLoadingProps) {
  return (
    <span className={`astro-chat-progress ${className}`} role="status">
      <span aria-hidden="true" className={dots ? 'astro-chat-progress-dots' : 'astro-chat-progress-spinner'}>
        {dots && <><span /><span /><span /></>}
      </span>
      <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
    </span>
  )
}

export default AstroChatLoading
