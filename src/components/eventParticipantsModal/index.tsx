import { SHOWCASE_NAMES } from '../../gtm/showcases'
import { BUTTONS } from '../../gtm/buttons'
import { useMemo, useState } from 'react'
import type { EventCollaborator } from '../../types/eventCreation'
import EventCollaboratorAvatar from '../eventCollaboratorAvatar'
import EventCheckbox from '../eventCheckbox'
import PurpleButton from '../purpleButton'
import ToolbarSelect from '../toolbarSelect'

interface EventParticipantsModalProps {
  collaborators: readonly EventCollaborator[]
  loading?: boolean
  nr: string
  onBack: () => void
  onContinue: () => void
  onSelectionChange: (ids: string[]) => void
  selectedIds: readonly string[]
  lockedParticipantIds?: readonly string[]
  selectionLocked?: boolean
}

const selectOptions = (values: string[]) => [
  { value: '', label: 'Todos', tone: 'muted' as const },
  ...Array.from(new Set(values)).map(value => ({ value, label: value })),
]

function EventParticipantsModal({ nr, collaborators: people, loading = false, onBack, onContinue, onSelectionChange, selectedIds, lockedParticipantIds = [], selectionLocked = false }: EventParticipantsModalProps) {
  const [filters, setFilters] = useState({ selected: '', unit: '', position: '', modality: '' })
  const collaborators = useMemo(() => people.filter(person =>
    (!filters.selected || selectedIds.includes(person.id) === (filters.selected === 'selected'))
    && (!filters.unit || person.unit === filters.unit)
    && (!filters.position || person.position === filters.position)
    && (!filters.modality || person.modality === filters.modality),
  ), [filters, selectedIds, people])
  const visibleIds = collaborators.filter(person => !lockedParticipantIds.includes(person.id)).map(person => person.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id))
  const selectedCount = people.filter(person => selectedIds.includes(person.id)).length
  const hasFilters = Object.values(filters).some(Boolean)
  const emptyMessage = people.length === 0
    ? nr ? `Nenhum colaborador elegível para a NR ${nr}. Confira se essa NR está associada aos cargos dos colaboradores.` : 'Nenhum colaborador elegível disponível neste workspace.'
    : filters.selected === 'selected' && selectedCount === 0
      ? 'Nenhum colaborador selecionado. Limpe os filtros para escolher os participantes.'
      : 'Nenhum colaborador corresponde aos filtros aplicados.'

  function toggleSelection(person: EventCollaborator) {
    if (loading || selectionLocked || lockedParticipantIds.includes(person.id)) return
    onSelectionChange(selectedIds.includes(person.id)
      ? selectedIds.filter(id => id !== person.id)
      : [...selectedIds, person.id])
  }

  function toggleVisible() {
    if (loading || selectionLocked) return
    onSelectionChange(allVisibleSelected
      ? selectedIds.filter(id => !visibleIds.includes(id))
      : [...new Set([...selectedIds, ...visibleIds])])
  }

  return <div className="event-create-step event-create-collaborators">
    <p className="event-create-description">Selecione os colaboradores que participarão do evento{nr ? ` da NR ${nr}` : ''}.{lockedParticipantIds.length > 0 ? ' Participantes de turmas que já começaram estão bloqueados.' : ''}</p>
    <div className="event-create-filters">
      <div className="event-create-field"><label htmlFor="event-create-selected">Selecionado</label><ToolbarSelect trackingAction={BUTTONS.comuns.selecionar_opcao} escapeOverflow className="event-create-select" id="event-create-selected" label="Filtrar por seleção" onValueChange={selected => setFilters(current => ({ ...current, selected }))} options={[{ value: '', label: 'Todos', tone: 'muted' }, { value: 'selected', label: 'Selecionados' }, { value: 'unselected', label: 'Não selecionados' }]} searchable={false} value={filters.selected} /></div>
      <div className="event-create-field"><label htmlFor="event-create-unit">Unidade</label><ToolbarSelect trackingAction={BUTTONS.comuns.unidade} escapeOverflow className="event-create-select" id="event-create-unit" label="Filtrar por unidade" onValueChange={unit => setFilters(current => ({ ...current, unit }))} options={selectOptions(people.map(person => person.unit))} searchable={false} value={filters.unit} /></div>
      <div className="event-create-field"><label htmlFor="event-create-position">Cargo</label><ToolbarSelect trackingAction={BUTTONS.comuns.cargo} escapeOverflow className="event-create-select" id="event-create-position" label="Filtrar por cargo" onValueChange={position => setFilters(current => ({ ...current, position }))} options={selectOptions(people.map(person => person.position))} searchable={false} value={filters.position} /></div>
      <div className="event-create-field"><label htmlFor="event-create-modality">Modalidade</label><ToolbarSelect trackingAction={BUTTONS.comuns.modalidade} escapeOverflow className="event-create-select" id="event-create-modality" label="Filtrar por modalidade" onValueChange={modality => setFilters(current => ({ ...current, modality }))} options={selectOptions(people.map(person => person.modality))} searchable={false} value={filters.modality} /></div>
    </div>
    <div className="event-create-selection-summary">
      {!loading && <p role="status">{selectedCount} {selectedCount === 1 ? 'colaborador selecionado' : 'colaboradores selecionados'} de {people.length} elegíveis · {collaborators.length} {collaborators.length === 1 ? 'exibido' : 'exibidos'}</p>}
      {hasFilters && <button className="astro-modal-cancel" onClick={() => setFilters({ selected: '', unit: '', position: '', modality: '' })} type="button">Limpar filtros</button>}
    </div>
    <div className="astro-data-table-shell event-create-table-shell">
      <div aria-label="Colaboradores disponíveis" className="astro-data-table-scroll event-create-table-scroll" role="region" tabIndex={0}>
      <table data-track-showcase={SHOWCASE_NAMES.lista_dialog_evento} className="astro-data-table event-create-table">
        <colgroup><col style={{ width: 'var(--event-selection-column-width, 5%)' }} /><col style={{ width: '25%' }} /><col style={{ width: '26%' }} /><col style={{ width: '18%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} /></colgroup>
        <thead><tr>
          <th scope="col"><EventCheckbox disabled={loading || selectionLocked || !visibleIds.length} checked={allVisibleSelected} label="Selecionar todos os colaboradores visíveis" onChange={toggleVisible} /></th>
          <th scope="col">Colaborador</th><th scope="col">Email</th><th scope="col">Unidade</th><th scope="col">Cargo</th><th scope="col">Modalidade</th>
        </tr></thead>
        <tbody>{collaborators.map(person => <tr key={person.id}>
          <td><EventCheckbox disabled={loading || selectionLocked || lockedParticipantIds.includes(person.id)} checked={selectedIds.includes(person.id)} label={`Selecionar ${person.name}`} onChange={() => toggleSelection(person)} /></td>
          <th scope="row"><span className="event-create-person"><EventCollaboratorAvatar name={person.name} photoUrl={person.profilePhotoUrl} initials={person.avatarInitials} /><span className="event-create-person-name" title={person.name}>{person.name}</span></span></th>
          <td title={person.email}>{person.email}</td><td title={person.unit}>{person.unit}</td><td>{person.position}</td><td>{person.modality}</td>
        </tr>)}</tbody>
      </table>
      {loading ? <p className="event-create-empty" role="status">Carregando colaboradores elegíveis...</p> : collaborators.length === 0 && <p className="event-create-empty" role="status">{emptyMessage}</p>}
      </div>
    </div>
    <div className="astro-modal-actions event-create-actions">
      <button data-track-action={BUTTONS.comuns.voltar} className="astro-modal-cancel" onClick={onBack} type="button">Voltar</button>
      <PurpleButton disabled={loading || selectedCount === 0} data-track-action={BUTTONS.comuns.continuar} onClick={onContinue} type="button">Continuar</PurpleButton>
    </div>
  </div>
}

export default EventParticipantsModal
