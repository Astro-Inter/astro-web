import type { EventDraft, EventGroup, EventGroupSchedule, EventSettings } from '../../types/eventCreation'
import PurpleButton from '../purpleButton'
import { completionOptions, evidenceOptions } from '../../data/eventSettings'

interface EventReviewModalProps {
  draft: EventDraft
  groups: readonly EventGroup[]
  assignments: Readonly<Record<string, string>>
  schedules: Readonly<Record<string, EventGroupSchedule>>
  settings: EventSettings
  onBack: () => void
  onCreate: () => void
  editing?: boolean
  error?: string
}

function EventReviewModal({ draft, groups, assignments, schedules, settings, onBack, onCreate, editing = false, error }: EventReviewModalProps) {
  const link = /^https?:\/\//i.test(draft.externalLink) ? draft.externalLink : undefined
  return <>
    <p className="event-create-description">{editing ? 'Confira todas as informações antes de salvar as alterações.' : 'Confira todas as informações antes de criar o evento.'}</p>
    <div className="event-create-review-grid">
      <section className="event-create-summary-card"><h3>Informações</h3><dl>
        <div><dt>Título</dt><dd>{draft.title || 'Não informado'}</dd></div>
        <div><dt>Descrição</dt><dd>{draft.description || 'Não informada'}</dd></div>
        <div><dt>Tipo do evento</dt><dd>{draft.type || 'Não informado'}</dd></div>
        <div><dt>NR</dt><dd>{draft.nr || 'Não informada'}</dd></div>
        <div><dt>Link externo</dt><dd>{link ? <a href={link} rel="noopener noreferrer" target="_blank">{draft.externalLink}</a> : draft.externalLink || 'Não informado'}</dd></div>
      </dl></section>
      <section className="event-create-summary-card event-create-summary-card--groups"><h3>Grupos</h3><dl>{groups.map(group => {
        const schedule = schedules[group.id]
        const date = schedule?.date ? schedule.date.split('-').reverse().join('/') : 'Data não definida'
        return <div key={group.id}><dt>{group.name}</dt><dd>{date} · {schedule?.startTime || '—'} – {schedule?.endTime || '—'}<br />{Object.values(assignments).filter(id => id === group.id).length} participantes</dd></div>
      })}</dl></section>
      <section className="event-create-summary-card"><h3>Configurações</h3><dl>
        <div><dt>Conclusão</dt><dd>{completionOptions.find(option => option.value === settings.completion && option.value)?.label || 'Não definida'}</dd></div>
        <div><dt>Evidência</dt><dd>{evidenceOptions.find(option => option.value === settings.evidenceRequired && option.value)?.label || 'Não definida'}</dd></div>
        <div><dt>Total de participantes</dt><dd>{Object.values(assignments).filter(id => groups.some(group => group.id === id)).length} colaboradores</dd></div>
        <div><dt>Total de grupos</dt><dd>{groups.length} {groups.length === 1 ? 'grupo' : 'grupos'}</dd></div>
      </dl></section>
    </div>
    {error && <p className="event-create-error" role="alert">{error}</p>}
    <div className="astro-modal-actions event-create-actions"><button className="astro-modal-cancel" onClick={onBack} type="button">Voltar</button><PurpleButton onClick={onCreate} type="button">{editing ? 'Salvar alterações' : 'Criar evento'}</PurpleButton></div>
  </>
}

export default EventReviewModal
