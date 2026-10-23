import { DIALOG_NAMES } from '../../gtm/dialogs'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePopupStepTransition } from '../../hooks/usePopupStepTransition'
import { useEventCandidates } from '../../hooks/useEventCandidates'
import { useEventCollaboratorPhotos } from '../../hooks/useEventCollaboratorPhotos'
import { validateEventForApi } from '../../utils/eventApi'
import type { EventConfiguration, EventDraft, EventGroup, EventGroupSchedule, EventSettings } from '../../types/eventCreation'
import { canEditEvent, startedGroupIds, validateEventEdit } from '../../utils/eventEditing'
import AppModal from '../appModal'
import ConfirmationModal from '../confirmationModal'
import EventInformationModal from '../eventInformationModal'
import EventParticipantsModal from '../eventParticipantsModal'
import EventGroupsModal from '../eventGroupsModal'
import EventGroupDistributionModal from '../eventGroupDistributionModal'
import EventGroupScheduleModal from '../eventGroupScheduleModal'
import EventSettingsModal from '../eventSettingsModal'
import EventReviewModal from '../eventReviewModal'
import EventGroupCollaboratorsModal from '../eventGroupCollaboratorsModal'

interface CreateEventFlowModalProps {
  onClose: () => void
  onSubmit: (value: EventConfiguration) => Promise<void>
  initialValue?: EventConfiguration
  mode?: 'create' | 'edit'
  managerId: string
}

type EventCreationStep = 'details' | 'collaborators' | 'groups' | 'schedule' | 'settings' | 'review'

const initialDraft: EventDraft = { title: '', description: '', type: 'Evento', nr: '', externalLink: '' }
const initialGroups: EventGroup[] = [{ id: 'group-1', name: 'Grupo 1' }]
const titles: Record<EventCreationStep, string> = {
  details: 'Informações do evento',
  collaborators: 'Selecionar colaboradores',
  groups: 'Organizar grupos',
  schedule: 'Organizar grupos',
  settings: 'Configurações',
  review: 'Revisão do evento',
}

function CreateEventFlowModal({ onClose, onSubmit, initialValue, managerId, mode = 'create' }: CreateEventFlowModalProps) {
  const [step, setStep] = useState<EventCreationStep>('details')
  const [collaboratorGroup, setCollaboratorGroup] = useState<{ name: string; ids: string[] } | null>(null)
  const animatePopupChange = usePopupStepTransition()
  const [draft, setDraft] = useState<EventDraft>(() => initialValue?.draft ?? initialDraft)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialValue?.selectedIds ?? [])
  const candidates = useEventCandidates(draft.nr)
  const collaborators = useEventCollaboratorPhotos([...candidates.collaborators, ...(initialValue?.collaborators ?? []).filter(person => !candidates.collaborators.some(candidate => candidate.id === person.id))])
  const [groups, setGroups] = useState<EventGroup[]>(() => initialValue?.groups ?? initialGroups)
  const [assignments, setAssignments] = useState<Record<string, string>>(() => initialValue?.assignments ?? {})
  const [distributionVersion, setDistributionVersion] = useState(0)
  const [randomOpen, setRandomOpen] = useState(false)
  const [randomClosing, setRandomClosing] = useState(false)
  const [schedules, setSchedules] = useState<Record<string, EventGroupSchedule>>(() => initialValue?.schedules ?? {})
  const [settings, setSettings] = useState<EventSettings>(() => initialValue?.settings ?? { completion: '', evidenceRequired: '' })
  const [error, setError] = useState('')
  const submittedRef = useRef(false)
  const [submitting, setSubmitting] = useState(false)
  const [pendingSave, setPendingSave] = useState<EventConfiguration | null>(null)
  const [saveDimmed, setSaveDimmed] = useState(false)
  const [saveClosing, setSaveClosing] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (mode !== 'edit') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [mode])
  const lockedGroupIds = initialValue && mode === 'edit' ? [...new Set([...(initialValue.permissions?.lockedGroupIds ?? []), ...startedGroupIds(initialValue, now)])] : []
  const lockedParticipantIds = initialValue ? Object.entries(initialValue.assignments).filter(([, groupId]) => lockedGroupIds.includes(groupId)).map(([id]) => id) : []
  const detailsLocked = mode === 'edit' && !!initialValue && (initialValue.permissions?.detailsEditable === false || !canEditEvent(initialValue, managerId) || lockedGroupIds.length > 0)

  function validationFor(value: EventConfiguration) {
    if (candidates.loading || candidates.error) return 'Carregue os participantes elegíveis antes de salvar.'
    if (mode === 'create' && value.draft.nr && !candidates.nrs.some(nr => String(nr.code) === value.draft.nr)) return 'Selecione uma NR destinada a colaboradores.'
    return validateEventForApi(value) ?? (mode === 'edit' && initialValue ? validateEventEdit(initialValue, value, managerId) : null)
  }

  function changeStep(nextStep: EventCreationStep) {
    setError('')
    animatePopupChange(() => setStep(nextStep))
  }

  async function submit(dismiss: () => void) {
    if (submittedRef.current) return
    const value: EventConfiguration = { ...initialValue, creatorId: initialValue?.creatorId ?? managerId, draft, selectedIds, groups, assignments, schedules, settings }
    const validationError = validationFor(value)
    if (validationError) {
      setError(validationError)
      return
    }
    if (mode === 'edit') {
      setPendingSave(structuredClone(value))
      setSaveDimmed(true)
      return
    }
    submittedRef.current = true
    setSubmitting(true)
    setError('')
    try { await onSubmit(value); setSubmitting(false); dismiss() }
    catch (error: unknown) { setError(error instanceof Error ? error.message : 'Não foi possível criar o evento. Tente novamente.') }
    finally { submittedRef.current = false; setSubmitting(false) }
  }

  function updateSelection(ids: string[]) {
    if (lockedParticipantIds.some(id => !ids.includes(id))) return
    setSelectedIds(ids)
    setAssignments(current => Object.fromEntries(Object.entries(current).filter(([personId]) => ids.includes(personId))))
  }

  useLayoutEffect(() => {
    document.querySelector<HTMLElement>('.event-create-modal[open] .astro-modal-title')?.focus({ preventScroll: true })
  }, [step])

  function distributeRandomly(count: number) {
    if (mode === 'edit') return
    const nextGroups = Array.from({ length: count }, (_, index) => ({ id: `group-${index + 1}`, name: `Grupo ${index + 1}` }))
    const shuffled = [...selectedIds]
    for (let index = shuffled.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1))
      const current = shuffled[index]
      shuffled[index] = shuffled[other]
      shuffled[other] = current
    }
    setRandomOpen(false)
    animatePopupChange(() => {
      setGroups(nextGroups)
      setSchedules({})
      setAssignments(Object.fromEntries(shuffled.map((id, index) => [id, nextGroups[index % count].id])))
      setDistributionVersion(current => current + 1)
    })
  }

  function resetGroups() {
    if (mode === 'edit') return
    setGroups(initialGroups)
    setAssignments({})
    setSchedules({})
  }

  function removeGroup(groupId: string) {
    if (lockedGroupIds.includes(groupId)) return
    setGroups(current => current.filter(group => group.id !== groupId))
    setAssignments(current => Object.fromEntries(Object.entries(current).filter(([, assignedGroupId]) => assignedGroupId !== groupId)))
    setSchedules(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== groupId)))
  }

  function addGroup() {
    setGroups(current => {
      const nextNumber = Math.max(current.length, ...current.map(group => Number(group.name.match(/\d+$/)?.[0]) || 0)) + 1
      return [...current, { id: `new-${crypto.randomUUID()}`, name: `Grupo ${nextNumber}` }]
    })
  }

  return <>
    <AppModal dismissible={!submitting} trackingName={({ details: DIALOG_NAMES.informacoes_evento, collaborators: DIALOG_NAMES.selecionar_colaboradores_evento, groups: DIALOG_NAMES.organizar_equipes_evento, schedule: DIALOG_NAMES.editar_equipes_evento, settings: DIALOG_NAMES.configuracoes_evento, review: DIALOG_NAMES.detalhes_evento })[step]} className={`event-create-modal event-create-modal--${step}`} dimmed={saveDimmed || (randomOpen && !randomClosing) || Boolean(collaboratorGroup)} onClose={() => { if (!pendingSave) onClose() }} open={!saveClosing} preservePageScroll title={mode === 'edit' && step === 'details' ? 'Editar evento' : titles[step]}>
      {dismiss => <div className="event-create-step-frame">
        {candidates.loading && <p role="status">Carregando NRs e participantes elegíveis...</p>}
        {candidates.error && <div role="alert"><p>{candidates.error}</p><button className="astro-modal-cancel" onClick={candidates.retry} type="button">Tentar novamente</button></div>}
        {step === 'details' && <EventInformationModal nrs={candidates.nrs} loading={candidates.loading || !!candidates.error} editing={mode === 'edit'} detailsLocked={detailsLocked} draft={draft} onCancel={dismiss} onChange={changes => { if (!detailsLocked) { if (changes.nr !== undefined && changes.nr !== draft.nr && mode === 'create') { setSelectedIds([]); setAssignments({}) }; setDraft(current => ({ ...current, ...changes, ...(mode === 'edit' && initialValue ? { nr: initialValue.draft.nr, type: initialValue.draft.type } : {}) })) } }} onContinue={() => changeStep('collaborators')} />}
        {step === 'collaborators' && <EventParticipantsModal collaborators={collaborators} loading={candidates.loading || !!candidates.error} lockedParticipantIds={lockedParticipantIds} nr={draft.nr} onBack={() => changeStep('details')} onContinue={() => changeStep('groups')} onSelectionChange={updateSelection} selectedIds={selectedIds} />}
        {step === 'groups' && <EventGroupsModal editing={mode === 'edit'} lockedGroupIds={lockedGroupIds} distributionVersion={distributionVersion} assignments={assignments} collaborators={collaborators.filter(person => selectedIds.includes(person.id))} groups={groups} onAddGroup={addGroup} onAssign={(personId, groupId) => { if (!lockedGroupIds.includes(groupId) && !lockedParticipantIds.includes(personId)) setAssignments(current => ({ ...current, [personId]: groupId })) }} onBack={() => changeStep('collaborators')} onContinue={() => changeStep('schedule')} onRandom={() => { setRandomClosing(false); setRandomOpen(true) }} onRemoveGroup={removeGroup} onReset={resetGroups} />}
        {step === 'schedule' && <EventGroupScheduleModal lockedGroupIds={lockedGroupIds} assignments={assignments} groups={groups} onBack={() => changeStep('groups')} onChange={(groupId, changes) => { if (!lockedGroupIds.includes(groupId)) setSchedules(current => ({ ...current, [groupId]: { ...(current[groupId] ?? { date: '', startTime: '', endTime: '' }), ...changes } })) }} onContinue={() => changeStep('settings')} schedules={schedules} />}
        {step === 'settings' && <EventSettingsModal editing={mode === 'edit'} onBack={() => changeStep('schedule')} onChange={changes => { if (mode !== 'edit') setSettings(current => ({ ...current, ...changes })) }} onContinue={() => changeStep('review')} settings={settings} />}
        {step === 'review' && <EventReviewModal submitting={submitting} editing={mode === 'edit'} error={error} assignments={assignments} draft={draft} groups={groups} onBack={() => changeStep('settings')} onCreate={() => { void submit(dismiss) }} schedules={schedules} settings={settings} onViewCollaborators={(group, ids) => setCollaboratorGroup({ name: group.name, ids })} />}
      </div>}
    </AppModal>
    {collaboratorGroup && <EventGroupCollaboratorsModal collaborators={collaborators} groupName={collaboratorGroup.name} participantIds={collaboratorGroup.ids} onClose={() => setCollaboratorGroup(null)} />}
    {randomOpen && <EventGroupDistributionModal onDismissRequest={() => setRandomClosing(true)} onCancel={() => setRandomOpen(false)} onContinue={distributeRandomly} />}
    {pendingSave && <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_alteracoes_evento}
      className="event-save-modal"
      confirmCloseDelay={60}
      confirmLabel="Salvar"
      onCancel={() => { setPendingSave(null); setSaveDimmed(false) }}
      onCancelRequest={() => setSaveDimmed(false)}
      onConfirm={async () => {
        if (submittedRef.current) return null
        const validationError = validationFor(pendingSave)
        if (validationError) return validationError
        submittedRef.current = true
        try { await onSubmit(pendingSave); setSaveClosing(true); return null }
        finally { submittedRef.current = false }
      }}
      onConfirmed={onClose}
      preservePageScroll
      title="Deseja salvar as alterações deste evento?"
    />}
  </>
}

export default CreateEventFlowModal
