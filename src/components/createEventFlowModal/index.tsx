import { useLayoutEffect } from 'react'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { useEventCreationFlow } from '../../hooks/useEventCreationFlow'
import type { EventConfiguration, EventCreationStep } from '../../types/eventCreation'
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


const titles: Record<EventCreationStep, string> = {
  details: 'Informações do evento',
  collaborators: 'Selecionar colaboradores',
  groups: 'Organizar grupos',
  schedule: 'Organizar grupos',
  settings: 'Configurações',
  review: 'Revisão do evento',
}

function CreateEventFlowModal({ onClose, onSubmit, initialValue, managerId, mode = 'create' }: CreateEventFlowModalProps) {
  const { step, collaboratorGroup, setCollaboratorGroup, draft, selectedIds, groups, assignments, schedules, settings,
    candidates, collaborators, distributionVersion, randomOpen, randomClosing, setRandomOpen, setRandomClosing,
    submitting, pendingSave, setPendingSave, saveDimmed, setSaveDimmed, saveClosing, lockedGroupIds, lockedParticipantIds,
    detailsLocked, changeStep, submit, updateSelection, distributeRandomly, distributionCounts, resetGroups, removeGroup, addGroup,
    updateDraft, assignParticipant, updateSchedule, updateSettings, confirmSave } = useEventCreationFlow({ initialValue, managerId, mode, onSubmit })
  useLayoutEffect(() => {
    document.querySelector<HTMLElement>('.event-create-modal[open] .astro-modal-title')?.focus({ preventScroll: true })
  }, [step])

  return <>
    <AppModal dismissible={!submitting} trackingName={({ details: DIALOG_NAMES.informacoes_evento, collaborators: DIALOG_NAMES.selecionar_colaboradores_evento, groups: DIALOG_NAMES.organizar_equipes_evento, schedule: DIALOG_NAMES.editar_equipes_evento, settings: DIALOG_NAMES.configuracoes_evento, review: DIALOG_NAMES.detalhes_evento })[step]} className={`event-create-modal event-create-modal--${step}`} dimmed={saveDimmed || (randomOpen && !randomClosing) || Boolean(collaboratorGroup)} onClose={() => { if (!pendingSave) onClose() }} open={!saveClosing} preservePageScroll title={mode === 'edit' && step === 'details' ? 'Editar evento' : titles[step]}>
      {dismiss => <div className="event-create-step-frame">
        {candidates.error && <div role="alert"><p>{candidates.error}</p><button className="astro-modal-cancel" onClick={candidates.retry} type="button">Tentar novamente</button></div>}
        {step === 'details' && <EventInformationModal nrs={candidates.nrs} loading={candidates.nrsLoading} unavailable={!!candidates.error} editing={mode === 'edit'} detailsLocked={detailsLocked} draft={draft} onCancel={dismiss} onChange={updateDraft} onContinue={() => changeStep('collaborators')} />}
        {step === 'collaborators' && <EventParticipantsModal collaborators={collaborators} loading={candidates.loading} unavailable={!!candidates.error} lockedParticipantIds={lockedParticipantIds} nr={draft.nr} onBack={() => changeStep('details')} onContinue={() => changeStep('groups')} onSelectionChange={updateSelection} selectedIds={selectedIds} />}
        {step === 'groups' && <EventGroupsModal editing={mode === 'edit'} lockedGroupIds={lockedGroupIds} distributionVersion={distributionVersion} assignments={assignments} collaborators={collaborators.filter(person => selectedIds.includes(person.id))} groups={groups} onAddGroup={addGroup} onAssign={assignParticipant} onBack={() => changeStep('collaborators')} onContinue={() => changeStep('schedule')} onRandom={() => { setRandomClosing(false); setRandomOpen(true) }} onRemoveGroup={removeGroup} onReset={resetGroups} />}
        {step === 'schedule' && <EventGroupScheduleModal lockedGroupIds={lockedGroupIds} assignments={assignments} groups={groups} onBack={() => changeStep('groups')} onChange={updateSchedule} onContinue={() => changeStep('settings')} schedules={schedules} />}
        {step === 'settings' && <EventSettingsModal editing={mode === 'edit'} onBack={() => changeStep('schedule')} onChange={updateSettings} onContinue={() => changeStep('review')} settings={settings} />}
        {step === 'review' && <EventReviewModal submitting={submitting} editing={mode === 'edit'} assignments={assignments} draft={draft} groups={groups} onBack={() => changeStep('settings')} onCreate={() => { void submit(dismiss) }} schedules={schedules} settings={settings} onViewCollaborators={(group, ids) => setCollaboratorGroup({ name: group.name, ids })} />}
      </div>}
    </AppModal>
    {collaboratorGroup && <EventGroupCollaboratorsModal collaborators={collaborators} groupName={collaboratorGroup.name} participantIds={collaboratorGroup.ids} onClose={() => setCollaboratorGroup(null)} />}
    {randomOpen && <EventGroupDistributionModal allowedCounts={distributionCounts} onDismissRequest={() => setRandomClosing(true)} onCancel={() => setRandomOpen(false)} onContinue={distributeRandomly} />}
    {pendingSave && <ConfirmationModal trackingName={DIALOG_NAMES.confirmar_alteracoes_evento}
      className="event-save-modal"
      confirmCloseDelay={60}
      confirmLabel="Salvar"
      onCancel={() => { setPendingSave(null); setSaveDimmed(false) }}
      onCancelRequest={() => setSaveDimmed(false)}
      onConfirm={confirmSave}
      onConfirmed={onClose}
      preservePageScroll
      title="Deseja salvar as alterações deste evento?"
    />}
  </>
}

export default CreateEventFlowModal
