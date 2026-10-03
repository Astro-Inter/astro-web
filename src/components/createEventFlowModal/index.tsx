import { useLayoutEffect, useRef, useState } from 'react'
import { usePopupStepTransition } from '../../hooks/usePopupStepTransition'
import { mockEventCollaborators } from '../../data/eventCreation'
import type { EventConfiguration, EventDraft, EventGroup, EventGroupSchedule, EventSettings } from '../../types/eventCreation'
import { validateEventConfiguration } from '../../utils/eventEditing'
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
}

type EventCreationStep = 'details' | 'collaborators' | 'groups' | 'schedule' | 'settings' | 'review'

const initialDraft: EventDraft = { title: '', description: '', type: '', nr: '', externalLink: '' }
const initialGroups: EventGroup[] = [{ id: 'group-1', name: 'Grupo 1' }]
const titles: Record<EventCreationStep, string> = {
  details: 'Informações do evento',
  collaborators: 'Selecionar colaboradores',
  groups: 'Organizar grupos',
  schedule: 'Organizar grupos',
  settings: 'Configurações',
  review: 'Revisão do evento',
}

function CreateEventFlowModal({ onClose, onSubmit, initialValue, mode = 'create' }: CreateEventFlowModalProps) {
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

  function changeStep(nextStep: EventCreationStep) {
    setError('')
    animatePopupChange(() => setStep(nextStep))
  }

  function submit(dismiss: () => void) {
    if (submittedRef.current) return
    const value: EventConfiguration = { draft, selectedIds, groups, assignments, schedules, settings }
    const validationError = validateEventConfiguration(value)
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
    setSelectedIds(ids)
    setAssignments(current => Object.fromEntries(Object.entries(current).filter(([personId]) => ids.includes(personId))))
  }

  useLayoutEffect(() => {
    document.querySelector<HTMLElement>('.event-create-modal[open] .astro-modal-title')?.focus({ preventScroll: true })
  }, [step])

  function distributeRandomly(count: number) {
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
    setGroups(initialGroups)
    setAssignments({})
    setSchedules({})
  }

  function removeGroup(groupId: string) {
    setGroups(current => current.filter(group => group.id !== groupId).map((group, index) => ({ ...group, name: `Grupo ${index + 1}` })))
    setAssignments(current => Object.fromEntries(Object.entries(current).filter(([, assignedGroupId]) => assignedGroupId !== groupId)))
    setSchedules(current => Object.fromEntries(Object.entries(current).filter(([id]) => id !== groupId)))
  }

  function addGroup() {
    setGroups(current => {
      const nextNumber = Math.max(0, ...current.map(group => Number(group.id.slice('group-'.length)) || 0)) + 1
      return [...current, { id: `group-${nextNumber}`, name: `Grupo ${current.length + 1}` }]
    })
  }

  return <>
    <AppModal className={`event-create-modal event-create-modal--${step}`} dimmed={saveDimmed || (randomOpen && !randomClosing)} onClose={() => { if (!pendingSave) onClose() }} open={!saveClosing} preservePageScroll title={mode === 'edit' && step === 'details' ? 'Editar evento' : titles[step]}>
      {dismiss => <div className="event-create-step-frame">
        {step === 'details' && <EventInformationModal draft={draft} onCancel={dismiss} onChange={changes => setDraft(current => ({ ...current, ...changes }))} onContinue={() => changeStep('collaborators')} />}
        {step === 'collaborators' && <EventParticipantsModal nr={draft.nr} onBack={() => changeStep('details')} onContinue={() => changeStep('groups')} onSelectionChange={updateSelection} selectedIds={selectedIds} />}
        {step === 'groups' && <EventGroupsModal distributionVersion={distributionVersion} assignments={assignments} collaborators={mockEventCollaborators.filter(person => selectedIds.includes(person.id))} groups={groups} onAddGroup={addGroup} onAssign={(personId, groupId) => setAssignments(current => ({ ...current, [personId]: groupId }))} onBack={() => changeStep('collaborators')} onContinue={() => changeStep('schedule')} onRandom={() => { setRandomClosing(false); setRandomOpen(true) }} onRemoveGroup={removeGroup} onReset={resetGroups} />}
        {step === 'schedule' && <EventGroupScheduleModal assignments={assignments} groups={groups} onBack={() => changeStep('groups')} onChange={(groupId, changes) => setSchedules(current => ({ ...current, [groupId]: { ...(current[groupId] ?? { date: '', startTime: '', endTime: '' }), ...changes } }))} onContinue={() => changeStep('settings')} schedules={schedules} />}
        {step === 'settings' && <EventSettingsModal onBack={() => changeStep('schedule')} onChange={changes => setSettings(current => ({ ...current, ...changes }))} onContinue={() => changeStep('review')} settings={settings} />}
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
        const validationError = validateEventConfiguration(pendingSave)
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
