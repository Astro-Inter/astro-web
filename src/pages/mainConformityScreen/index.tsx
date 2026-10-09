import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, ConfirmationModal, ConformityFilterModal, ConformityFormModal, DataTable, ImportConformityModal, ManagerIdentity, OptionsPopup, ToolbarSearch, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import { mockConformities } from '../../data/conformities'
import { mockEmployees } from '../../data/employees'
import { defaultNrsRows } from '../../data/regulatoryStandards'
import { useActionsMenu } from '../../hooks'
import type { Conformity, ConformityFilters, ConformityFormValues } from '../../types'
import { conformityStatusLabels, emptyConformityFilters, formatConformityDate, getConformityStatus, matchesConformityFilters } from '../../utils/conformity'
import { iconAsset } from '../../utils/iconAsset'

const statusClassNames = {
  valid: ' position-status--active',
  expired: ' position-status--expired',
  'no-expiry': ' position-status--no-expiry',
}
const nrOptions = defaultNrsRows.map((row) => row.code.replace(/^NR/, 'NR '))
const closedAddFlow = { importOpen: false, manualOpen: false, importClosing: false }

type ConformityDialogState =
  | { kind: 'edit' | 'remove'; conformity: Conformity }
  | { kind: 'confirm-edit'; conformity: Conformity; values: ConformityFormValues }

function MainConformityScreenPage() {
  const addOriginRef = useRef<HTMLButtonElement | null>(null)
  const filterTriggerRef = useRef<HTMLButtonElement>(null)
  const focusAfterRemoveRef = useRef<string | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const [conformities, setConformities] = useState<Conformity[]>(mockConformities)
  const [filters, setFilters] = useState<ConformityFilters & { search: string }>({ ...emptyConformityFilters, search: '' })
  const [addFlow, setAddFlow] = useState(closedAddFlow)
  const [filterOpen, setFilterOpen] = useState(false)
  const [dialog, setDialog] = useState<ConformityDialogState | null>(null)
  const [editForm, setEditForm] = useState({ dimmed: false, closing: false })
  const actions = useActionsMenu()
  const [savedConformityId, setSavedConformityId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
  }, [])

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleConformities = conformities.filter((conformity) => conformity.employeeName.toLocaleLowerCase('pt-BR').includes(normalizedSearch) && matchesConformityFilters(conformity, filters))
  const activeFilterCount = [filters.nr, filters.origin, filters.from || filters.to].filter(Boolean).length
  const openConformity = visibleConformities.find((conformity) => conformity.id === actions.openId)

  function showSavedConformity(conformityId: string | null, message: string) {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
    setSavedConformityId(conformityId)
    setFeedback(message)
    savedTimerRef.current = window.setTimeout(() => {
      savedTimerRef.current = null
      setSavedConformityId(null)
    }, 900)
  }

  function addConformity(values: ConformityFormValues): string | null {
    const employee = mockEmployees.find((item) => item.id === values.employeeId)
    if (!employee) return 'Selecione o colaborador.'
    const duplicateError = checkDuplicate(values)
    if (duplicateError) return duplicateError

    const newConformityId = crypto.randomUUID()
    setConformities((current) => [{ id: newConformityId, employeeId: employee.id, employeeName: employee.name, nr: values.nr, expiresAt: values.expiresAt || null, origin: 'Manual' }, ...current])
    showSavedConformity(newConformityId, `Conformidade da ${values.nr} adicionada para ${employee.name}.`)
    setAddFlow((current) => ({ ...current, importClosing: true }))
    return null
  }

  function checkDuplicate(values: ConformityFormValues, conformityId?: string): string | null {
    return conformities.some((conformity) => conformity.id !== conformityId && conformity.employeeId === values.employeeId && conformity.nr === values.nr)
      ? 'Esse colaborador já possui conformidade nessa NR.'
      : null
  }

  function saveConformity(conformity: Conformity, values: ConformityFormValues): string | null {
    const duplicateError = checkDuplicate(values, conformity.id)
    if (duplicateError) return duplicateError

    setConformities((current) => current.map((item) => item.id === conformity.id ? { ...item, nr: values.nr, expiresAt: values.expiresAt || null } : item))
    showSavedConformity(conformity.id, `Conformidade de ${conformity.employeeName} atualizada.`)
    return null
  }

  function removeConformity(conformity: Conformity) {
    const index = visibleConformities.findIndex((item) => item.id === conformity.id)
    const neighbor = visibleConformities[index + 1] ?? visibleConformities[index - 1]
    focusAfterRemoveRef.current = neighbor?.id ?? null
    setConformities((current) => current.filter((item) => item.id !== conformity.id))
    showSavedConformity(null, `Conformidade da ${conformity.nr} de ${conformity.employeeName} marcada como não aplicável.`)
  }

  function closeDialog() {
    setDialog(null)
    setEditForm({ dimmed: false, closing: false })
    requestAnimationFrame(() => {
      const neighbor = document.querySelector<HTMLButtonElement>(`[data-conformity-id="${focusAfterRemoveRef.current}"]`)
      const target = actions.triggerRef.current?.isConnected ? actions.triggerRef.current : neighbor ?? filterTriggerRef.current
      focusAfterRemoveRef.current = null
      target?.focus()
    })
  }

  function closeAddFlow() {
    setAddFlow(closedAddFlow)
    requestAnimationFrame(() => addOriginRef.current?.focus())
  }

  const columns: DataTableColumn<Conformity>[] = [
    { id: 'employee', label: 'Colaborador', width: '23%', rowHeader: true, render: (conformity) => <ManagerIdentity name={conformity.employeeName} /> },
    { id: 'nr', label: 'NR', width: '11%', render: (conformity) => <TruncatedText>{conformity.nr}</TruncatedText> },
    { id: 'expiresAt', label: 'Data de validade', width: '20.5%', render: (conformity) => <TruncatedText>{formatConformityDate(conformity.expiresAt)}</TruncatedText> },
    { id: 'origin', label: 'Origem', width: '13%', render: (conformity) => <TruncatedText>{conformity.origin}</TruncatedText> },
    {
      id: 'status', label: 'Status', width: '19%',
      render: (conformity) => {
        const status = getConformityStatus(conformity.expiresAt)
        return <span className={`position-status${statusClassNames[status]}`}><TruncatedText truncate={false}>{conformityStatusLabels[status]}</TruncatedText></span>
      },
    },
    {
      id: 'actions', label: 'Ações', width: '13.5%', className: 'position-actions-cell',
      render: (conformity) => (
        <div className="position-actions">
          <button
            aria-controls={actions.openId === conformity.id ? `conformity-actions-${conformity.id}` : undefined}
            aria-expanded={actions.openId === conformity.id}
            aria-haspopup="menu"
            aria-label={`Ações para ${conformity.employeeName} na ${conformity.nr}`}
            className="position-actions-trigger"
            data-conformity-id={conformity.id}
            onClick={(event) => actions.toggle(conformity.id, event.currentTarget)}
            type="button"
          >
            <AstroIcon name="dots" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="main-position-screen main-manager-screen main-conformity-screen">
      <AppSidebar />

      <main className="position-main" id="conteudo-principal">
        <section aria-labelledby="conformities-title" className="position-content astro-scale-90">
          <header className="position-heading">
            <h1 id="conformities-title">Conformidades</h1>
            <p>Acompanhe a situação de conformidade dos colaboradores em relação às NRs. Cada linha representa um colaborador e uma NR.</p>
          </header>

          <div aria-label="Ações e filtros das conformidades" className="position-toolbar" role="group">
            <CompactPurpleButton aria-haspopup="dialog" onClick={(event) => { addOriginRef.current = event.currentTarget; setAddFlow({ ...closedAddFlow, importOpen: true }) }} type="button">
              <AstroIcon name="plus" />
              Adicionar conformidade
            </CompactPurpleButton>

            <ToolbarSearch
              label="Buscar colaboradores"
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              onClear={() => setFilters((current) => ({ ...current, search: '' }))}
              placeholder="Buscar colaboradores..."
              value={filters.search}
            />

            <div className="position-toolbar-selects">
              <button aria-haspopup="dialog" aria-label={activeFilterCount ? `Filtros, ${activeFilterCount} ${activeFilterCount === 1 ? 'ativo' : 'ativos'}` : 'Filtros'} className="conformity-filter-button" onClick={() => setFilterOpen(true)} ref={filterTriggerRef} type="button">
                {activeFilterCount ? `Filtros (${activeFilterCount})` : 'Filtros'}
                <AstroIcon name="chevron-down" />
              </button>
            </div>
          </div>

          <DataTable ariaLabel="Conformidades" columns={columns} emptyMessage="Nenhuma conformidade encontrada para esses filtros." getRowClassName={(conformity) => conformity.id === savedConformityId ? 'astro-data-table-row--saved' : undefined} getRowKey={(conformity) => conformity.id} rows={visibleConformities} />
          <p className="sr-only" role="status">{feedback}</p>
        </section>
        {openConformity && createPortal(
          <OptionsPopup
            ariaLabel={`Opções para ${openConformity.employeeName} na ${openConformity.nr}`}
            closing={actions.closing}
            id={`conformity-actions-${openConformity.id}`}
            items={[
              { id: 'cancel', label: 'Cancelar', separatorAfter: true, tone: 'muted', onSelect: () => actions.close() },
              { id: 'edit', label: 'Editar', separatorAfter: true, onSelect: () => actions.close(() => setDialog({ kind: 'edit', conformity: openConformity })) },
              { id: 'remove', label: 'Tornar não aplicável', tone: 'danger', onSelect: () => actions.close(() => setDialog({ kind: 'remove', conformity: openConformity })) },
            ]}
            onClose={() => actions.close()}
            panelRef={actions.panelRef}
            style={actions.style}
          />,
          document.body,
        )}
        <AstroChat />
      </main>

      {addFlow.importOpen && (
        <ImportConformityModal
          dimmed={addFlow.manualOpen}
          onClose={closeAddFlow}
          onImport={(file) => showSavedConformity(null, `Planilha ${file.name} enviada para importação.`)}
          onManualAdd={() => setAddFlow((current) => ({ ...current, manualOpen: true }))}
          open={!addFlow.importClosing}
        />
      )}
      {addFlow.manualOpen && (
        <ConformityFormModal
          employees={mockEmployees}
          nrs={nrOptions}
          onClose={() => setAddFlow((current) => ({ ...current, manualOpen: false }))}
          onSubmit={addConformity}
        />
      )}
      {filterOpen && (
        <ConformityFilterModal
          filters={filters}
          nrs={nrOptions}
          onApply={(nextFilters) => setFilters((current) => ({ ...current, ...nextFilters }))}
          onClose={() => {
            setFilterOpen(false)
            filterTriggerRef.current?.focus()
          }}
        />
      )}
      {dialog && (dialog.kind === 'edit' || dialog.kind === 'confirm-edit') && (
        <ConformityFormModal
          dimmed={editForm.dimmed}
          employee={mockEmployees.find((employee) => employee.id === dialog.conformity.employeeId) ?? { name: dialog.conformity.employeeName, email: '' }}
          employees={mockEmployees}
          initialValues={{ employeeId: dialog.conformity.employeeId, nr: dialog.conformity.nr, expiresAt: dialog.conformity.expiresAt ?? '' }}
          key={dialog.conformity.id}
          nrs={nrOptions}
          onClose={() => {
            if (dialog.kind !== 'confirm-edit') closeDialog()
          }}
          onSubmit={(values) => {
            const error = checkDuplicate(values, dialog.conformity.id)
            if (error) return error
            setEditForm((current) => ({ ...current, dimmed: true }))
            setDialog({ kind: 'confirm-edit', conformity: dialog.conformity, values })
            return null
          }}
          open={!editForm.closing}
        />
      )}
      {dialog?.kind === 'confirm-edit' && (
        <ConfirmationModal
          confirmCloseDelay={60}
          confirmLabel="Salvar"
          onCancel={() => {
            setEditForm((current) => ({ ...current, dimmed: false }))
            setDialog({ kind: 'edit', conformity: dialog.conformity })
          }}
          onCancelRequest={() => setEditForm((current) => ({ ...current, dimmed: false }))}
          onConfirm={() => {
            const error = saveConformity(dialog.conformity, dialog.values)
            if (!error) setEditForm((current) => ({ ...current, closing: true }))
            return error
          }}
          onConfirmed={closeDialog}
          title="Deseja salvar as alterações da conformidade deste colaborador?"
        />
      )}
      {dialog?.kind === 'remove' && (
        <ConfirmationModal
          backdrop="dimmed"
          className="position-deactivation-modal"
          confirmLabel="Tornar não aplicável"
          icon={<span aria-hidden="true" className="position-deactivation-icon"><img alt="" src={iconAsset('warning.svg')} /></span>}
          onCancel={closeDialog}
          onConfirm={() => { removeConformity(dialog.conformity); return null }}
          onConfirmed={closeDialog}
          title="Tem certeza de que deseja tornar esta conformidade não aplicável?"
          tone="danger"
        />
      )}
    </div>
  )
}

export default MainConformityScreenPage
