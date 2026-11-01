import { useEffect, useRef, useState } from 'react'
import { useActionFeedback } from './useActionFeedback'
import { usePopupStepTransition } from './usePopupStepTransition'
import { useEventCandidates } from './useEventCandidates'
import { useEventCollaboratorPhotos } from './useEventCollaboratorPhotos'
import { shuffleParticipants } from '../utils/eventDistribution'
import { validateEventForApi } from '../utils/eventApi'
import { validateEventSchedule } from '../utils/eventStepValidation'
import { canEditEvent, startedGroupIds, validateEventEdit } from '../utils/eventEditing'
import type { EventConfiguration, EventCreationForm, EventCreationStep, EventDraft, EventGroup, EventGroupSchedule, EventSettings } from '../types/eventCreation'

interface EventCreationFlowOptions { initialValue?: EventConfiguration; managerId: string; mode: 'create' | 'edit'; onSubmit: (value: EventConfiguration) => Promise<void> }
const initialDraft: EventDraft = { title: '', description: '', type: 'Evento', nr: '', externalLink: '' }
const initialGroups: EventGroup[] = [{ id: 'group-1', name: 'Grupo 1' }]

export function useEventCreationFlow({ initialValue, managerId, mode, onSubmit }: EventCreationFlowOptions) {
  const [step, setStep] = useState<EventCreationStep>('details')
  const [collaboratorGroup, setCollaboratorGroup] = useState<{ name: string; ids: string[] } | null>(null)
  const animatePopupChange = usePopupStepTransition()
  const [form, setForm] = useState<EventCreationForm>(() => ({
    draft: initialValue?.draft ?? initialDraft,
    selectedIds: initialValue?.selectedIds ?? [], groups: initialValue?.groups ?? initialGroups,
    assignments: initialValue?.assignments ?? {}, schedules: initialValue?.schedules ?? {},
    settings: initialValue?.settings ?? { completion: '', evidenceRequired: '' },
  }))
  const { draft, selectedIds, groups, assignments, schedules, settings } = form
  const candidates = useEventCandidates(draft.nr)
  const collaborators = useEventCollaboratorPhotos([...candidates.collaborators, ...(initialValue?.collaborators ?? []).filter(person => !candidates.collaborators.some(candidate => candidate.id === person.id))])
  const [distributionVersion, setDistributionVersion] = useState(0)
  const [randomOpen, setRandomOpen] = useState(false)
  const [randomClosing, setRandomClosing] = useState(false)
  const notify = useActionFeedback()
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
    for (const group of value.groups) {
      if (lockedGroupIds.includes(group.id)) continue
      const error = Object.values(validateEventSchedule(value.schedules[group.id]))[0]
      if (error) return `${group.name}: ${error}`
    }
    return validateEventForApi(value) ?? (mode === 'edit' && initialValue ? validateEventEdit(initialValue, value, managerId) : null)
  }

  function changeStep(nextStep: EventCreationStep) {
    animatePopupChange(() => setStep(nextStep))
  }

  async function submit(dismiss: () => void) {
    if (submittedRef.current) return
    const value: EventConfiguration = { ...initialValue, creatorId: initialValue?.creatorId ?? managerId, draft, selectedIds, groups, assignments, schedules, settings }
    const validationError = validationFor(value)
    if (validationError) {
      notify(validationError, 'error')
      return
    }
    if (mode === 'edit') {
      setPendingSave(structuredClone(value))
      setSaveDimmed(true)
      return
    }
    submittedRef.current = true
    setSubmitting(true)
    try { await onSubmit(value); setSubmitting(false); dismiss() }
    catch (error: unknown) { notify(error instanceof Error ? error.message : 'Não foi possível criar o evento. Tente novamente.', 'error') }
    finally { submittedRef.current = false; setSubmitting(false) }
  }

  function updateSelection(ids: string[]) {
    if (lockedParticipantIds.some(id => !ids.includes(id))) return
    setForm(current => ({ ...current, selectedIds: ids, assignments: Object.fromEntries(Object.entries(current.assignments).filter(([personId]) => ids.includes(personId))) }))
  }

  function distributeRandomly(count: number) {
    if (!distributionCounts.includes(count)) return
    const lockedGroups = groups.filter(group => lockedGroupIds.includes(group.id))
    const editableGroups = groups.filter(group => !lockedGroupIds.includes(group.id))
    const nextGroups = mode === 'edit' && !initialValue?.permissions ? [...groups] : mode === 'edit'
      ? [...lockedGroups, ...Array.from({ length: count - lockedGroups.length }, (_, index) => editableGroups[index] ?? { id: `new-${crypto.randomUUID()}`, name: `Grupo ${groups.length + index + 1}` })]
      : Array.from({ length: count }, (_, index) => ({ id: `group-${index + 1}`, name: `Grupo ${index + 1}` }))
    const destinations = nextGroups.filter(group => !lockedGroupIds.includes(group.id))
    if (!destinations.length) return
    const shuffled = shuffleParticipants(selectedIds.filter(id => !lockedParticipantIds.includes(id)))
    setRandomOpen(false)
    animatePopupChange(() => {
      setForm(current => ({ ...current, groups: nextGroups,
        schedules: mode === 'edit' ? Object.fromEntries(Object.entries(current.schedules).filter(([id]) => nextGroups.some(group => group.id === id))) : {},
        assignments: {
        ...Object.fromEntries(Object.entries(current.assignments).filter(([id]) => lockedParticipantIds.includes(id))),
        ...Object.fromEntries(shuffled.map((id, index) => [id, destinations[index % destinations.length].id])),
        },
      }))
      setDistributionVersion(current => current + 1)
    })
  }

  const distributionCounts = mode === 'edit' && !initialValue?.permissions
    ? (groups.length > lockedGroupIds.length && groups.length <= selectedIds.length ? [groups.length] : [])
    : Array.from({ length: Math.min(Math.max(8, groups.length), lockedGroupIds.length + selectedIds.filter(id => !lockedParticipantIds.includes(id)).length) }, (_, index) => index + 1).filter(count => count >= 1 && count > lockedGroupIds.length)

  function resetGroups() {
    if (mode === 'edit') return
    setForm(current => ({ ...current, groups: initialGroups, assignments: {}, schedules: {} }))
  }

  function removeGroup(groupId: string) {
    if (lockedGroupIds.includes(groupId)) return
    setForm(current => ({ ...current,
      groups: current.groups.filter(group => group.id !== groupId),
      assignments: Object.fromEntries(Object.entries(current.assignments).filter(([, assignedGroupId]) => assignedGroupId !== groupId)),
      schedules: Object.fromEntries(Object.entries(current.schedules).filter(([id]) => id !== groupId)),
    }))
  }

  function addGroup() {
    setForm(current => {
      if (current.groups.length >= current.selectedIds.length) return current
      const nextNumber = Math.max(current.groups.length, ...current.groups.map(group => Number(group.name.match(/\d+$/)?.[0]) || 0)) + 1
      return { ...current, groups: [...current.groups, { id: `new-${crypto.randomUUID()}`, name: `Grupo ${nextNumber}` }] }
    })
  }


  function updateDraft(changes: Partial<EventDraft>) {
    if (detailsLocked) return
    setForm(current => ({ ...current,
      ...(mode === 'create' && changes.nr !== undefined && changes.nr !== current.draft.nr ? { selectedIds: [], assignments: {} } : {}),
      draft: { ...current.draft, ...changes, ...(mode === 'edit' && initialValue ? { nr: initialValue.draft.nr, type: initialValue.draft.type } : {}) },
    }))
  }
  function assignParticipant(personId: string, groupId: string) {
    if (!lockedGroupIds.includes(groupId) && !lockedParticipantIds.includes(personId)) setForm(current => ({ ...current, assignments: { ...current.assignments, [personId]: groupId } }))
  }
  function updateSchedule(groupId: string, changes: Partial<EventGroupSchedule>) {
    if (!lockedGroupIds.includes(groupId)) setForm(current => ({ ...current, schedules: { ...current.schedules, [groupId]: { ...(current.schedules[groupId] ?? { date: '', startTime: '', endTime: '' }), ...changes } } }))
  }
  function updateSettings(changes: Partial<EventSettings>) {
    if (mode !== 'edit') setForm(current => ({ ...current, settings: { ...current.settings, ...changes } }))
  }
  async function confirmSave(): Promise<string | null> {
    if (submittedRef.current || !pendingSave) return null
    const validationError = validationFor(pendingSave)
    if (validationError) return validationError
    submittedRef.current = true
    try { await onSubmit(pendingSave); setSaveClosing(true); return null }
    finally { submittedRef.current = false }
  }
  return { step, collaboratorGroup, setCollaboratorGroup, draft, selectedIds, groups, assignments, schedules, settings,
    candidates, collaborators, distributionVersion, randomOpen, randomClosing, setRandomOpen, setRandomClosing,
    submitting, pendingSave, setPendingSave, saveDimmed, setSaveDimmed, saveClosing, lockedGroupIds, lockedParticipantIds,
    detailsLocked, changeStep, submit, updateSelection, distributeRandomly, distributionCounts, resetGroups, removeGroup, addGroup,
    updateDraft, assignParticipant, updateSchedule, updateSettings, confirmSave }
}
