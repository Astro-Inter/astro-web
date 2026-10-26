import { useExitPresence } from '../../hooks/useExitPresence'

interface AnimatedFieldErrorProps {
  message?: string
  id?: string
  className?: string
}

function AnimatedFieldError({ message, id, className = 'login-field-error' }: AnimatedFieldErrorProps) {
  const presence = useExitPresence(message, Boolean(message))
  if (!presence.present) return null
  return <p className={`${className}${presence.exiting ? ' event-field-error--exiting' : ''}`} aria-hidden={presence.exiting || undefined} id={presence.exiting ? undefined : id} role={presence.exiting ? undefined : 'alert'}>{presence.value}</p>
}

export default AnimatedFieldError
