import { useLayoutEffect, useState } from 'react'
import { mockEventCollaborators } from '../../data/eventCreation'
import type { EventDraft, EventGroup } from '../../types/eventCreation'
import AppModal from '../AppModal'
import CreateEvent1ModalWeb from '../CreateEvent1ModalWeb'
import CreateEvent2ModalWeb from '../CreateEvent2ModalWeb'
import CreateEvent3ModalWeb from '../CreateEvent3ModalWeb'
import CreateEvent3RandomModalWeb from '../CreateEvent3RandomModalWeb'

interface CreateEventFlowModalProps {
  onClose: () => void
}

type EventCreationStep = 'details' | 'collaborators' | 'groups'

const initialDraft: EventDraft = { title: '', description: '', type: '', nr: '', externalLink: '' }
const initialGroups: EventGroup[] = [{ id: 'group-1', name: 'Grupo 1' }]
const titles: Record<EventCreationStep, string> = {
  details: 'Informações do evento',
  collaborators: 'Selecionar colaboradores',
  groups: 'Organizar grupos',
}

function CreateEventFlowModal({ onClose }: CreateEventFlowModalProps) {
  const [step, setStep] = useState<EventCreationStep>('details')
  const [animateStep, setAnimateStep] = useState(false)
  const [draft, setDraft] = useState<EventDraft>(initialDraft)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => mockEventCollaborators.map(person => person.id))
  const [groups, setGroups] = useState<EventGroup[]>(initialGroups)
  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [randomOpen, setRandomOpen] = useState(false)

  function changeStep(nextStep: EventCreationStep) {
    setAnimateStep(true)
    setStep(nextStep)
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
    setGroups(nextGroups)
    setAssignments(Object.fromEntries(shuffled.map((id, index) => [id, nextGroups[index % count].id])))
    setRandomOpen(false)
  }

  function resetGroups() {
    setGroups(initialGroups)
    setAssignments({})
  }

  function removeGroup(groupId: string) {
    setGroups(current => current.filter(group => group.id !== groupId).map((group, index) => ({ ...group, name: `Grupo ${index + 1}` })))
    setAssignments(current => Object.fromEntries(Object.entries(current).filter(([, assignedGroupId]) => assignedGroupId !== groupId)))
  }

  function addGroup() {
    setGroups(current => {
      const nextNumber = Math.max(0, ...current.map(group => Number(group.id.slice('group-'.length)) || 0)) + 1
      return [...current, { id: `group-${nextNumber}`, name: `Grupo ${current.length + 1}` }]
    })
  }

  return <>
    <AppModal className={`event-create-modal event-create-modal--${step}`} dimmed={randomOpen} onClose={onClose} preservePageScroll title={titles[step]}>
      {dismiss => <div className={`event-create-step-frame${animateStep ? ' event-create-step-frame--animated' : ''}`} key={step}>
        {step === 'details' && <CreateEvent1ModalWeb draft={draft} onCancel={dismiss} onChange={changes => setDraft(current => ({ ...current, ...changes }))} onContinue={() => changeStep('collaborators')} />}
        {step === 'collaborators' && <CreateEvent2ModalWeb nr={draft.nr} onBack={() => changeStep('details')} onContinue={() => { resetGroups(); changeStep('groups') }} onSelectionChange={setSelectedIds} selectedIds={selectedIds} />}
        {step === 'groups' && <CreateEvent3ModalWeb assignments={assignments} collaborators={mockEventCollaborators.filter(person => selectedIds.includes(person.id))} groups={groups} onAddGroup={addGroup} onAssign={(personId, groupId) => setAssignments(current => ({ ...current, [personId]: groupId }))} onBack={() => changeStep('collaborators')} onContinue={dismiss} onRandom={() => setRandomOpen(true)} onRemoveGroup={removeGroup} onReset={resetGroups} />}
      </div>}
    </AppModal>
    {randomOpen && <CreateEvent3RandomModalWeb onCancel={() => setRandomOpen(false)} onContinue={distributeRandomly} />}
  </>
}

export default CreateEventFlowModal
