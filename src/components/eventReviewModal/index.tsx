import { BUTTONS } from '../../gtm/buttons'
import type { EventDraft, EventGroup, EventGroupSchedule, EventSettings } from '../../types/eventCreation'
import PurpleButton from '../purpleButton'
import ActionLoading from '../actionLoading'
import EventGroupsSummary from '../eventGroupsSummary'
import { completionOptions, evidenceOptions } from '../../data/eventSettings'
import TruncatedText from '../truncatedText'
import { formatRegulatoryStandardCode } from '../../utils/regulatoryStandardCode'

interface EventReviewModalProps {
  draft: EventDraft
  groups: readonly EventGroup[]
  assignments: Readonly<Record<string, string>>
  schedules: Readonly<Record<string, EventGroupSchedule>>
  settings: EventSettings
  onBack: () => void
  onCreate: () => void
  editing?: boolean
  submitting?: boolean
  onViewCollaborators?: (group: EventGroup, ids: string[]) => void
}

function EventReviewModal({ draft, groups, assignments, schedules, settings, onBack, onCreate, editing = false, submitting = false, onViewCollaborators }: EventReviewModalProps) {
  const link = /^https?:\/\//i.test(draft.externalLink) ? draft.externalLink : undefined
  return <>
    <p className="event-create-description">{editing ? 'Confira todas as informações antes de salvar as alterações.' : 'Confira todas as informações antes de criar o evento.'}</p>
    <div className="event-create-review-grid">
      <section className="event-create-summary-card"><h3>Informações</h3><dl aria-label="Dados do evento" tabIndex={0}>
        <div><dt>Título</dt><dd><TruncatedText>{draft.title || 'Não informado'}</TruncatedText></dd></div>
        <div><dt>Descrição</dt><dd><TruncatedText>{draft.description || 'Não informada'}</TruncatedText></dd></div>
        <div><dt>Tipo do evento</dt><dd><TruncatedText>{draft.type || 'Não informado'}</TruncatedText></dd></div>
        <div><dt>NR</dt><dd><TruncatedText>{draft.nr ? formatRegulatoryStandardCode(`NR ${draft.nr}`) : 'Não informada'}</TruncatedText></dd></div>
        <div><dt>Link externo</dt><dd>{link ? <a data-track-action={BUTTONS.comuns.abrir_link_evento} href={link} rel="noopener noreferrer" target="_blank"><TruncatedText>{draft.externalLink}</TruncatedText></a> : <TruncatedText>{draft.externalLink || 'Não informado'}</TruncatedText>}</dd></div>
      </dl></section>
      <section className="event-create-summary-card event-create-summary-card--groups"><h3>Grupos</h3><EventGroupsSummary assignments={assignments} groups={groups} schedules={schedules} onViewCollaborators={onViewCollaborators} /></section>
      <section className="event-create-summary-card"><h3>Configurações</h3><dl aria-label="Configurações do evento" tabIndex={0}>
        <div><dt>Forma de conclusão</dt><dd><TruncatedText>{completionOptions.find(option => option.value === settings.completion && option.value)?.label || 'Não definida'}</TruncatedText></dd></div>
        <div><dt>Evidência obrigatória</dt><dd><TruncatedText>{evidenceOptions.find(option => option.value === settings.evidenceRequired && option.value)?.label || 'Não definida'}</TruncatedText></dd></div>
        <div><dt>Total de participantes</dt><dd><TruncatedText>{`${Object.values(assignments).filter(id => groups.some(group => group.id === id)).length} colaboradores`}</TruncatedText></dd></div>
        <div><dt>Total de turmas</dt><dd><TruncatedText>{`${groups.length} ${groups.length === 1 ? 'turma' : 'turmas'}`}</TruncatedText></dd></div>
      </dl></section>
    </div>
    <ActionLoading active={submitting} />
    <div className="astro-modal-actions event-create-actions"><button disabled={submitting} data-track-action={BUTTONS.comuns.voltar} className="astro-modal-cancel" onClick={onBack} type="button">Voltar</button><PurpleButton disabled={submitting} data-track-action={editing ? BUTTONS.comuns.salvar_alteracoes : BUTTONS.comuns.criar_evento} onClick={onCreate} type="button">{editing ? 'Salvar alterações' : 'Criar evento'}</PurpleButton></div>
  </>
}

export default EventReviewModal
