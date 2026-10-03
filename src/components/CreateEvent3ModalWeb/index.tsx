import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useAnimatedClose } from '../../hooks/useAnimatedClose'
import type { EventCollaborator, EventGroup } from '../../types/eventCreation'
import AstroIcon from '../AstroIcon'
import EventCollaboratorAvatar from '../EventCollaboratorAvatar'
import PurpleButton from '../PurpleButton'
import ToolbarSearch from '../ToolbarSearch'

interface CreateEvent3ModalWebProps {
  distributionVersion: number
  assignments: Readonly<Record<string, string>>
  collaborators: readonly EventCollaborator[]
  groups: readonly EventGroup[]
  onAddGroup: () => void
  onAssign: (personId: string, groupId: string) => void
  onBack: () => void
  onContinue: () => void
  onRandom: () => void
  onRemoveGroup: (groupId: string) => void
  onReset: () => void
}

function CreateEvent3ModalWeb({ distributionVersion, assignments, collaborators, groups, onAddGroup, onAssign, onBack, onContinue, onRandom, onRemoveGroup, onReset }: CreateEvent3ModalWebProps) {
  const groupsRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const dragPointerRef = useRef<{ x: number; y: number } | null>(null)
  const scrollFrameRef = useRef<number | null>(null)
  const returnAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropGroupIdRef = useRef<string | null>(null)
  const [animationBaseline, setAnimationBaseline] = useState(() => ({ version: distributionVersion, ids: new Set(groups.map(group => group.id)) }))
  if (animationBaseline.version !== distributionVersion) {
    setAnimationBaseline({ version: distributionVersion, ids: new Set(groups.map(group => group.id)) })
  }
  const [search, setSearch] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropGroupId, setDropGroupId] = useState<string | null>(null)
  const [orderIds, setOrderIds] = useState<string[]>(() => collaborators.map(person => person.id))
  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null)
  const [returningIds, setReturningIds] = useState<string[]>([])
  const [resetVersion, setResetVersion] = useState(0)
  const { closing: groupClosing, requestClose: requestGroupClose } = useAnimatedClose(220)
  const { closing: resetting, requestClose: requestReset } = useAnimatedClose(180)
  const visible = collaborators.filter(person => person.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
    .sort((first, second) => orderIds.indexOf(first.id) - orderIds.indexOf(second.id))
  const draggedPerson = collaborators.find(person => person.id === draggedId)
  const destinations = ['', ...groups.map(group => group.id)]

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
    if (returnAnimationTimerRef.current !== null) clearTimeout(returnAnimationTimerRef.current)
  }, [])

  function showDropTarget(section: HTMLElement) {
    const groupId = section.dataset.groupId ?? ''
    if (dropGroupIdRef.current === groupId) return
    dropGroupIdRef.current = groupId
    setDropGroupId(groupId)
    const members = section.querySelector<HTMLElement>('.event-create-group-members')
    if (members && draggedId && groupId !== (assignments[draggedId] ?? '')) {
      requestAnimationFrame(() => { members.scrollTop = members.scrollHeight })
    }
  }

  function stopBoardScroll() {
    dragPointerRef.current = null
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current)
    scrollFrameRef.current = null
  }

  function scrollBoard() {
    scrollFrameRef.current = null
    const board = boardRef.current
    const pointer = dragPointerRef.current
    if (!board || !pointer || board.scrollWidth <= board.clientWidth) return
    const bounds = board.getBoundingClientRect()
    const edge = Math.min(80, bounds.width * .15)
    const left = Math.max(0, bounds.left + edge - pointer.x) / edge
    const right = Math.max(0, pointer.x - (bounds.right - edge)) / edge
    const direction = right > 0 ? Math.min(right, 1) : -Math.min(left, 1)
    if (!direction) return
    const previous = board.scrollLeft
    board.scrollLeft += direction * (3 + 11 * Math.abs(direction))
    if (board.scrollLeft === previous) return
    const section = document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>('.event-create-group-column')
    if (section && board.contains(section)) showDropTarget(section)
    scrollFrameRef.current = requestAnimationFrame(scrollBoard)
  }

  function clearDrag() {
    stopBoardScroll()
    setDraggedId(null)
    dropGroupIdRef.current = null
    setDropGroupId(null)
  }

  function movePerson(personId: string, groupId: string) {
    setOrderIds(current => {
      const withoutPerson = current.filter(id => id !== personId)
      const lastGroupIndex = withoutPerson.findLastIndex(id => (assignments[id] ?? '') === groupId)
      const insertAt = lastGroupIndex + 1
      return [...withoutPerson.slice(0, insertAt), personId, ...withoutPerson.slice(insertAt)]
    })
    if ((assignments[personId] ?? '') !== groupId) onAssign(personId, groupId)
    clearDrag()
  }

  function dropInto(event: DragEvent<HTMLElement>, groupId: string) {
    event.preventDefault()
    const personId = event.dataTransfer.getData('text/plain') || draggedId
    if (personId && collaborators.some(person => person.id === personId)) movePerson(personId, groupId)
    else clearDrag()
  }

  function personButton(person: EventCollaborator) {
    const current = assignments[person.id] ?? ''
    return <button
      aria-label={`${person.name}, ${current ? groups.find(group => group.id === current)?.name ?? 'grupo' : 'não distribuído'}. Arraste para outro grupo ou use as setas esquerda e direita.`}
      className={`event-create-person-chip${draggedId === person.id ? ' event-create-person-chip--dragging' : ''}${returningIds.includes(person.id) && !current ? ' event-create-person-chip--returning' : ''}`}
      draggable
      data-person-id={person.id}
      key={person.id}
      onDragEnd={clearDrag}
      onDragStart={event => { setDraggedId(person.id); dropGroupIdRef.current = null; setDropGroupId(null); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', person.id) }}
      onKeyDown={event => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        const index = destinations.indexOf(current)
        const next = destinations[index + (event.key === 'ArrowRight' ? 1 : -1)]
        if (next !== undefined) {
          movePerson(person.id, next)
          requestAnimationFrame(() => {
            const movedButton = [...groupsRef.current?.querySelectorAll<HTMLButtonElement>('[data-person-id]') ?? []]
              .find(button => button.dataset.personId === person.id)
            movedButton?.focus({ preventScroll: true })
          })
        }
      }}
      title={person.name}
      type="button"
    ><EventCollaboratorAvatar /><span>{person.name}</span></button>
  }

  function preview() {
    return draggedPerson && <div aria-hidden="true" className="event-create-person-chip event-create-person-chip--preview" key="drop-preview"><EventCollaboratorAvatar /><span>{draggedPerson.name}</span></div>
  }

  function removeGroup(groupId: string) {
    if (groupClosing || resetting) return
    clearDrag()
    setRemovingGroupId(groupId)
    requestGroupClose(() => {
      const returning = collaborators.filter(person => assignments[person.id] === groupId).map(person => person.id)
      setOrderIds(current => [...current.filter(id => !returning.includes(id)), ...returning])
      setReturningIds(returning)
      onRemoveGroup(groupId)
      setRemovingGroupId(null)
      if (returnAnimationTimerRef.current !== null) clearTimeout(returnAnimationTimerRef.current)
      returnAnimationTimerRef.current = setTimeout(() => {
        setReturningIds([])
        returnAnimationTimerRef.current = null
      }, 320)
    })
  }

  function resetGroups() {
    if (groupClosing || resetting) return
    clearDrag()
    requestReset(() => {
      setOrderIds(collaborators.map(person => person.id))
      setReturningIds([])
      onReset()
      setResetVersion(current => current + 1)
    })
  }

  return <div className="event-create-step event-create-groups" ref={groupsRef}>
    <p className="event-create-description">Arraste os colaboradores para onde devem ser distribuídos.</p>
    <div className="event-create-group-tools">
      <PurpleButton className="event-create-random-trigger" onClick={onRandom} type="button"><AstroIcon name="distribution" />Distribuir aleatoriamente</PurpleButton>
      <ToolbarSearch label="Buscar colaboradores para distribuir" onChange={event => setSearch(event.target.value)} onClear={() => setSearch('')} placeholder="Buscar colaboradores..." value={search} />
    </div>
    <div
      className={`event-create-group-board${resetting ? ' event-create-group-board--resetting' : resetVersion > 0 ? ' event-create-group-board--reset-in' : ''}`}
      key={resetVersion}
      onDragLeave={event => {
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) stopBoardScroll()
      }}
      onDragOver={event => {
        if (!draggedId) return
        event.preventDefault()
        dragPointerRef.current = { x: event.clientX, y: event.clientY }
        if (scrollFrameRef.current === null) scrollFrameRef.current = requestAnimationFrame(scrollBoard)
      }}
      ref={boardRef}
    >
      {[{ id: '', name: 'Não distribuídos' }, ...groups].map(group => <section
        aria-label={group.name}
        className={`event-create-group-column${group.id && !animationBaseline.ids.has(group.id) ? ' event-create-group-column--added' : ''}${group.id === '' ? ' event-create-group-column--unassigned' : ''}${dropGroupId === group.id ? ' event-create-group-column--drop-target' : ''}${removingGroupId === group.id ? ' event-create-group-column--removing' : ''}`}
        data-group-id={group.id}
        key={group.id || 'unassigned'}
        onDragOver={event => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          if (!draggedId) return
          showDropTarget(event.currentTarget)
        }}
        onDragLeave={event => {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
            dropGroupIdRef.current = null
            setDropGroupId(null)
          }
        }}
        onDrop={event => dropInto(event, group.id)}
      >
        <div className="event-create-group-heading">
          <h3>{group.name}</h3>
          {group.id && <button aria-label={`Excluir ${group.name}`} className="event-create-group-delete" disabled={groupClosing} onClick={() => removeGroup(group.id)} title={`Excluir ${group.name}`} type="button"><AstroIcon name="trash" /></button>}
        </div>
        <div className="event-create-group-members">
          {visible.filter(person => (assignments[person.id] ?? '') === group.id).map(personButton)}
          {dropGroupId === group.id && preview()}
        </div>
      </section>)}
      <button className="event-create-add-group" onClick={onAddGroup} type="button"><AstroIcon name="plus" />Adicionar grupo</button>
    </div>
    <div className="event-create-group-footer">
      <button className="event-create-reset" disabled={groupClosing || resetting} onClick={resetGroups} type="button"><AstroIcon name="reload" />Reiniciar</button>
      <div className="astro-modal-actions event-create-actions"><button className="astro-modal-cancel" onClick={onBack} type="button">Voltar</button><PurpleButton onClick={onContinue} type="button">Continuar</PurpleButton></div>
    </div>
  </div>
}

export default CreateEvent3ModalWeb
