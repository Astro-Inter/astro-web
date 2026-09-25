import { useMemo, useState } from 'react'
import AppModal from '../AppModal'
import AstroIcon from '../AstroIcon'
import CompactPurpleButton from '../CompactPurpleButton'
import DataTable from '../DataTable'
import ToolbarSearch from '../ToolbarSearch'
import type { DataTableColumn } from '../DataTable'
import { defaultNrsRows } from '../../data/nrs'
import type { NrsRow } from '../../types'

interface NrsDialogProps {
  contextLabel?: string
  dimmed?: boolean
  onClose: () => void
  onEdit?: () => void
  open?: boolean
  positionName: string
  rows?: readonly NrsRow[]
}

function NrsDialog({ contextLabel, dimmed = false, onClose, onEdit, open = true, positionName, rows = defaultNrsRows }: NrsDialogProps) {
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const visibleRows = useMemo(() => normalizedSearch
    ? rows.filter((row) => `${row.code} ${row.description}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
    : rows, [normalizedSearch, rows])

  const columns: readonly DataTableColumn<NrsRow>[] = [
    { id: 'code', label: 'NR', width: '16%', rowHeader: true, render: (row) => <span className="nrs-dialog-code">{row.code}</span> },
    { id: 'description', label: 'Descrição', width: '84%', render: (row) => <span className="nrs-dialog-description">{row.description}</span> },
  ]

  return (
    <AppModal
      className="nrs-dialog"
      dimmed={dimmed}
      onClose={onClose}
      open={open}
      title={`NRs de ${positionName}${contextLabel ? ` da ${contextLabel}` : ''}`}
    >
      {(dismiss) => <>
        <p className="nrs-dialog-subtitle">Edite, organize e mantenha todas as Normas Regulamentadoras.</p>

        <div className="nrs-dialog-toolbar">
          <CompactPurpleButton className="nrs-dialog-edit" onClick={onEdit} type="button">
            <AstroIcon name="pencil" strokeScale={1} />
            Editar NRs
          </CompactPurpleButton>
          <ToolbarSearch
            autoComplete="off"
            className="nrs-dialog-search"
            label="Buscar NRs"
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
            placeholder="Buscar NRs..."
            value={search}
          />
        </div>

        <div className="nrs-dialog-table">
          <DataTable
            ariaLabel="Normas Regulamentadoras"
            columns={columns}
            emptyMessage="Nenhuma NR encontrada."
            getRowKey={(row) => row.id}
            rows={visibleRows}
          />
        </div>

        <div className="nrs-dialog-footer">
          <button className="astro-modal-cancel nrs-dialog-back" onClick={dismiss} type="button">Voltar</button>
        </div>
      </>}
    </AppModal>
  )
}

export default NrsDialog
