import TruncatedText from '../truncatedText'

interface ManagerIdentityProps {
  name: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  return `${parts[0]?.[0] ?? ''}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toLocaleUpperCase('pt-BR')
}

function ManagerIdentity({ name }: ManagerIdentityProps) {
  return (
    <span className="manager-identity">
      <span aria-hidden="true" className="manager-avatar">{getInitials(name)}</span>
      <TruncatedText>{name}</TruncatedText>
    </span>
  )
}

export default ManagerIdentity
