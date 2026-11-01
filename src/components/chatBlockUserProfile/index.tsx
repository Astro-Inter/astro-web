import type { ChatUserCardBlock } from '../../types/chatBlocks'
import ChatBlockAvatar from '../chatBlockAvatar'

interface UserProfileProps { card: ChatUserCardBlock }
export default function UserProfile({ card }: UserProfileProps) {
  const compliance = card.conformidade
  return <section className="chat-data-card chat-user-card" aria-label={card.titulo}>
    <div className="chat-user-card-heading">
      <ChatBlockAvatar showName={false} item={{ nome: card.nome || '', email: card.email ?? null, url: card.foto?.url ?? null }} /><h4>{card.titulo}</h4></div>
    <div className="chat-user-card-body">
      <dl>{[['Nome', card.nome], ['E-mail', card.email], ['Cargo', card.cargo], ['Unidade', card.unidade], ['Perfil', card.perfil], ['Modalidade', card.modalidade], ['Situação', card.situacao]].map(([label, value]) => value && <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
    {compliance && <div className="chat-user-compliance"><strong>Conformidade cadastral: {compliance.percentual === null ? 'Sem NRs aplicáveis' : `${compliance.percentual.toLocaleString('pt-BR')}%`}</strong>
      {compliance.percentual !== null && <meter min="0" max="100" value={compliance.percentual} aria-label="Conformidade cadastral" />}
      <small>{compliance.vigentes} de {compliance.total} NRs vigentes. {compliance.criterio}{compliance.data_referencia ? ` · Referência: ${compliance.data_referencia}` : ''}</small>
    </div>}
  </section>
}
