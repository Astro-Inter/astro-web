import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { usePopupStepTransition } from '../../hooks/usePopupStepTransition'
import { mockEventCollaborators } from '../../data/eventCreation'
import type { EventConfiguration, EventDraft, EventGroup, EventGroupSchedule, EventSettings } from '../../types/eventCreation'
import { canEditEvent, startedGroupIds, validateEventConfiguration, validateEventEdit } from '../../utils/eventEditing'
import AppModal from '../appModal'
import ConfirmationModal from '../confirmationModal'
import EventInformationModal from '../eventInformationModal'
import EventParticipantsModal from '../eventParticipantsModal'
import EventGroupsModal from '../eventGroupsModal'
import EventGroupDistributionModal from '../eventGroupDistributionModal'
import EventGroupScheduleModal from '../eventGroupScheduleModal'
import EventSettingsModal from '../eventSettingsModal'
import EventReviewModal from '../eventReviewModal'

interface CreateEventFlowModalProps {
  onClose: () => void
  onSubmit: (value: EventConfiguration) => void
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
  const animatePopupChange = usePopupStepTransition()
  const [draft, setDraft] = useState<EventDraft>(() => initialValue?.draft ?? initialDraft)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialValue?.selectedIds ?? mockEventCollaborators.map(person => person.id))
  const [groups, setGroups] = useState<EventGroup[]>(() => initialValue?.groups ?? initialGroups)
  const [assignments, setAssignments] = useState<Record<string, string>>(() => initialValue?.assignments ?? {})
  const [distributionVersion, setDistributionVersion] = useState(0)
  const [randomOpen, setRandomOpen] = useState(false)
  const [randomClosing, setRandomClosing] = useState(false)
  const [schedules, setSchedules] = useState<Record<string, EventGroupSchedule>>(() => initialValue?.schedules ?? {})
  const [settings, setSettings] = useState<EventSettings>(() => initialValue?.settings ?? { completion: '', evidenceRequired: '' })
  const [error, setError] = useState('')
  const submittedRef = useRef(false)
  const [pendingSave, setPendingSave] = useState<EventConfiguration | null>(null)
  const [saveDimmed, setSaveDimmed] = useState(false)
  const [saveClosing, setSaveClosing] = useState(false)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (mode !== 'edit') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [mode])
  const lockedGroupIds = initialValue && mode === 'edit' ? startedGroupIds(initialValue, now) : []
  const lockedParticipantIds = initialValue ? Object.entries(initialValue.assignments).filter(([, groupId]) => lockedGroupIds.includes(groupId)).map(([id]) => id) : []
  const detailsLocked = mode === 'edit' && !!initialValue && (!canEditEvent(initialValue, managerId) || lockedGroupIds.length > 0)

  function validationFor(value: EventConfiguration) {
    return validateEventConfiguration(value) ?? (mode === 'edit' && initialValue ? validateEventEdit(initialValue, value, managerId) : null)
  }

  function changeStep(nextStep: EventCreationStep) {
    setError('')
    animatePopupChange(() => setStep(nextStep))
  }

  function submit(dismiss: () => void) {
    if (submittedRef.current) return
    const value: EventConfiguration = { creatorId: initialValue?.creatorId ?? managerId, draft, selectedIds, groups, assignments, schedules, settings }
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
    onSubmit(value)
    dismiss()
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
    if (mode === 'edit') return
    setGroups(current => current.filter(group => group.id !== groupId).map((group, index) => ({ ...group, name: `Grupo ${index + 1}` })))
    setAssignments(current => Object.fromEntries(Object.entries(current).filter(([, assignedGroupId]) => assignedGroupId !== groupId)))
    setSchedules(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== groupId)))
  }

  function addGroup() {
    if (mode === 'edit') return
    setGroups(current => {
      const nextNumber = Math.max(0, ...current.map(group => Number(group.id.slice('group-'.length)) || 0)) + 1
      return [...current, { id: `group-${nextNumber}`, name: `Grupo ${current.length + 1}` }]
    })
  }

  return <>
    <AppModal className={`event-create-modal event-create-modal--${step}`} dimmed={saveDimmed || (randomOpen && !randomClosing)} onClose={() => { if (!pendingSave) onClose() }} open={!saveClosing} preservePageScroll title={mode === 'edit' && step === 'details' ? 'Editar evento' : titles[step]}>
      {dismiss => <div className="event-create-step-frame">
        {step === 'details' && <EventInformationModal editing={mode === 'edit'} detailsLocked={detailsLocked} draft={draft} onCancel={dismiss} onChange={changes => { if (!detailsLocked) setDraft(current => ({ ...current, ...changes, ...(mode === 'edit' && initialValue ? { nr: initialValue.draft.nr, type: initialValue.draft.type } : {}) })) }} onContinue={() => changeStep('collaborators')} />}
        {step === 'collaborators' && <EventParticipantsModal selectionLocked={mode === 'edit' && lockedGroupIds.length === groups.length} lockedParticipantIds={lockedParticipantIds} nr={draft.nr} onBack={() => changeStep('details')} onContinue={() => changeStep('groups')} onSelectionChange={updateSelection} selectedIds={selectedIds} />}
        {step === 'groups' && <EventGroupsModal editing={mode === 'edit'} lockedGroupIds={lockedGroupIds} distributionVersion={distributionVersion} assignments={assignments} collaborators={mockEventCollaborators.filter(person => selectedIds.includes(person.id))} groups={groups} onAddGroup={addGroup} onAssign={(personId, groupId) => { if (!lockedGroupIds.includes(groupId) && !lockedParticipantIds.includes(personId)) setAssignments(current => ({ ...current, [personId]: groupId })) }} onBack={() => changeStep('collaborators')} onContinue={() => changeStep('schedule')} onRandom={() => { setRandomClosing(false); setRandomOpen(true) }} onRemoveGroup={removeGroup} onReset={resetGroups} />}
        {step === 'schedule' && <EventGroupScheduleModal lockedGroupIds={lockedGroupIds} assignments={assignments} groups={groups} onBack={() => changeStep('groups')} onChange={(groupId, changes) => { if (!lockedGroupIds.includes(groupId)) setSchedules(current => ({ ...current, [groupId]: { ...(current[groupId] ?? { date: '', startTime: '', endTime: '' }), ...changes } })) }} onContinue={() => changeStep('settings')} schedules={schedules} />}
        {step === 'settings' && <EventSettingsModal editing={mode === 'edit'} onBack={() => changeStep('schedule')} onChange={changes => { if (mode !== 'edit') setSettings(current => ({ ...current, ...changes })) }} onContinue={() => changeStep('review')} settings={settings} />}
        {step === 'review' && <EventReviewModal editing={mode === 'edit'} error={error} assignments={assignments} draft={draft} groups={groups} onBack={() => changeStep('settings')} onCreate={() => submit(dismiss)} schedules={schedules} settings={settings} />}
      </div>}
    </AppModal>
    {randomOpen && <EventGroupDistributionModal onDismissRequest={() => setRandomClosing(true)} onCancel={() => setRandomOpen(false)} onContinue={distributeRandomly} />}
    {pendingSave && <ConfirmationModal
      confirmCloseDelay={60}
      confirmLabel="Salvar"
      onCancel={() => { setPendingSave(null); setSaveDimmed(false) }}
      onCancelRequest={() => setSaveDimmed(false)}
      onConfirm={() => {
        if (submittedRef.current) return null
        const validationError = validationFor(pendingSave)
        if (validationError) return validationError
        submittedRef.current = true
        onSubmit(pendingSave)
        setSaveClosing(true)
        return null
      }}
      onConfirmed={onClose}
      preservePageScroll
      title="Deseja salvar as alterações deste evento?"
    />}
  </>
}

export default CreateEventFlowModal
