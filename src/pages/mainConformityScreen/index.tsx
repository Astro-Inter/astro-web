import { useEffect, useRef, useState } from 'react'
import { AddConformityModal, AppSidebar, AstroChat, AstroIcon, CompactPurpleButton, DataTable, ImportConformityModal, ManagerIdentity, ToolbarSearch, TruncatedText } from '../../components'
import type { DataTableColumn } from '../../components/dataTable'
import { mockConformities } from '../../data/conformities'
import { mockEmployees } from '../../data/employees'
import { defaultNrsRows } from '../../data/regulatoryStandards'
import type { Conformity, ConformityFormValues } from '../../types'
import { conformityStatusLabels, formatConformityDate, getConformityStatus } from '../../utils/conformity'

const statusClassNames = {
  valid: ' position-status--active',
  expired: ' position-status--expired',
  'no-expiry': ' position-status--no-expiry',
}
const nrOptions = defaultNrsRows.map((row) => row.code.replace(/^NR/, 'NR '))
const closedAddFlow = { importOpen: false, manualOpen: false, importClosing: false }

function MainConformityScreenPage() {
  const addOriginRef = useRef<HTMLButtonElement | null>(null)
  const savedTimerRef = useRef<number | null>(null)
  const [conformities, setConformities] = useState<Conformity[]>(mockConformities)
  const [filters, setFilters] = useState({ search: '' })
  const [addFlow, setAddFlow] = useState(closedAddFlow)
  const [savedConformityId, setSavedConformityId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  useEffect(() => () => {
    if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current)
  }, [])

  const normalizedSearch = filters.search.trim().toLocaleLowerCase('pt-BR')
  const visibleConformities = conformities.filter((conformity) => conformity.employeeName.toLocaleLowerCase('pt-BR').includes(normalizedSearch))

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
    if (conformities.some((conformity) => conformity.employeeName === employee.name && conformity.nr === values.nr)) return 'Esse colaborador já possui conformidade nessa NR.'

    const newConformityId = crypto.randomUUID()
    setConformities((current) => [{ id: newConformityId, employeeName: employee.name, nr: values.nr, expiresAt: values.expiresAt || null, origin: 'Manual' }, ...current])
    showSavedConformity(newConformityId, `Conformidade da ${values.nr} adicionada para ${employee.name}.`)
    setAddFlow((current) => ({ ...current, importClosing: true }))
    return null
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
          <button aria-label={`Ações para ${conformity.employeeName} na ${conformity.nr}`} className="position-actions-trigger" type="button">
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
              <button className="conformity-filter-button" type="button">
                Filtros
                <AstroIcon name="chevron-down" />
              </button>
            </div>
          </div>

          <DataTable ariaLabel="Conformidades" columns={columns} emptyMessage="Nenhuma conformidade encontrada para esses filtros." getRowClassName={(conformity) => conformity.id === savedConformityId ? 'astro-data-table-row--saved' : undefined} getRowKey={(conformity) => conformity.id} rows={visibleConformities} />
          <p className="sr-only" role="status">{feedback}</p>
        </section>
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
        <AddConformityModal
          employees={mockEmployees}
          nrs={nrOptions}
          onAdd={addConformity}
          onClose={() => setAddFlow((current) => ({ ...current, manualOpen: false }))}
        />
      )}
    </div>
  )
}

export default MainConformityScreenPage
