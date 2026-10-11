import AppModal from '../appModal'
import DataTable, { type DataTableColumn } from '../dataTable'
import TruncatedText from '../truncatedText'
import { mockEventCollaborators } from '../../data/eventCreation'
import type { EventCollaborator } from '../../types/eventCreation'

interface EventGroupCollaboratorsModalProps {
  groupName: string
  participantIds: readonly string[]
  onClose: () => void
}

const columns: readonly DataTableColumn<EventCollaborator>[] = [
  { id: 'name', label: 'Colaborador', width: '20%', rowHeader: true, render: person => <TruncatedText>{person.name}</TruncatedText> },
  { id: 'email', label: 'Email', width: '25%', render: person => <TruncatedText>{person.email}</TruncatedText> },
  { id: 'unit', label: 'Unidade', width: '19%', render: person => <TruncatedText>{person.unit}</TruncatedText> },
  { id: 'position', label: 'Cargo', width: '18%', render: person => <TruncatedText>{person.position}</TruncatedText> },
  { id: 'modality', label: 'Modalidade', width: '18%', render: person => <TruncatedText>{person.modality}</TruncatedText> },
]

function EventGroupCollaboratorsModal({ groupName, participantIds, onClose }: EventGroupCollaboratorsModalProps) {
  const collaborators = mockEventCollaborators.filter(person => participantIds.includes(person.id))
  return <AppModal className="event-group-collaborators-modal" preservePageScroll title="Colaboradores do grupo" onClose={onClose}>
    {dismiss => <>
      <p className="astro-modal-description"><TruncatedText>{`${groupName} · ${collaborators.length} colaboradores`}</TruncatedText></p>
      <DataTable ariaLabel={`Colaboradores de ${groupName}`} columns={columns} rows={collaborators} getRowKey={person => person.id} emptyMessage="Nenhum colaborador neste grupo." />
      <div className="astro-modal-actions"><button className="astro-modal-cancel" onClick={dismiss} type="button">Voltar</button></div>
    </>}
  </AppModal>
}

export default EventGroupCollaboratorsModal
