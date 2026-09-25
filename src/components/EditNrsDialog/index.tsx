import { useMemo, useState } from 'react'
import AppModal from '../AppModal'
import DataTable from '../DataTable'
import PurpleButton from '../PurpleButton'
import ToolbarSearch from '../ToolbarSearch'
import ToggleSwitch from '../ToggleSwitch'
import { defaultNrsRows } from '../../data/nrs'
import type { DataTableColumn } from '../DataTable'
import type { NrsRow } from '../../types'

interface EditNrsDialogProps {
  contextLabel?: string
  enabledIds: readonly string[]
  dimmed?: boolean
  onCancel: () => void
  onRecommendationClick?: (row: NrsRow) => void
  onDismissRequest?: () => void
  onRequestConfirmation: (enabledIds: string[]) => void
  open?: boolean
  positionName: string
  recommendedIds?: readonly string[]
  rows?: readonly NrsRow[]
}

function EditNrsDialog({ contextLabel, enabledIds, dimmed = false, onCancel, onDismissRequest, onRecommendationClick, onRequestConfirmation, open = true, positionName, recommendedIds = [], rows = defaultNrsRows }: EditNrsDialogProps) {
  const [form, setForm] = useState(() => ({ search: '', enabledIds: new Set(enabledIds) }))
  const normalizedSearch = form.search.trim().toLocaleLowerCase('pt-BR')
  const visibleRows = useMemo(() => normalizedSearch
    ? rows.filter((row) => `${row.code} ${row.description}`.toLocaleLowerCase('pt-BR').includes(normalizedSearch))
    : rows, [normalizedSearch, rows])

  function toggleNr(id: string, enabled: boolean) {
    setForm((current) => {
      const nextEnabledIds = new Set(current.enabledIds)
      if (enabled) nextEnabledIds.add(id)
      else nextEnabledIds.delete(id)
      return { ...current, enabledIds: nextEnabledIds }
    })
  }

  const columns: readonly DataTableColumn<NrsRow>[] = [
    { id: 'code', label: 'NR', width: '16%', rowHeader: true, render: (row) => <span className="nrs-dialog-code">{row.code}</span> },
    { id: 'description', label: 'Descrição', width: '62%', render: (row) => <span className="nrs-dialog-description">{row.description}</span> },
    {
      id: 'actions', label: 'Ações', width: '22%', className: 'nrs-edit-actions-cell',
      render: (row) => <div className="nrs-edit-row-actions">
        <ToggleSwitch
          checked={form.enabledIds.has(row.id)}
          label={`${form.enabledIds.has(row.id) ? 'Desativar' : 'Ativar'} ${row.code}`}
          onChange={(enabled) => toggleNr(row.id, enabled)}
        />
        {recommendedIds.includes(row.id) && (
          <button
            aria-label={`Ver recomendação de IA para ${row.code}`}
            className="nrs-edit-row-recommendation"
            onClick={() => onRecommendationClick?.(row)}
            title="Recomendação de IA"
            type="button"
          >
            <img alt="" aria-hidden="true" className="nrs-edit-row-robot" draggable={false} src="/robot5.png" />
          </button>
        )}
      </div>,
    },
  ]

  return (
    <AppModal
      className="nrs-dialog nrs-edit-dialog"
      dimmed={dimmed}
      onClose={onCancel}
      onDismissRequest={onDismissRequest}
      open={open}
      title={`Edite as NRs de ${positionName}${contextLabel ? ` da ${contextLabel}` : ''}`}
    >
      {(dismiss) => <>
        <p className="nrs-dialog-subtitle">Edite, organize e mantenha todas as Normas Regulamentadoras.</p>

        <div className="nrs-dialog-toolbar nrs-edit-toolbar">
          <ToolbarSearch
            autoComplete="off"
            className="nrs-dialog-search"
            label="Buscar NRs"
            onChange={(event) => setForm((current) => ({ ...current, search: event.target.value }))}
            onClear={() => setForm((current) => ({ ...current, search: '' }))}
            placeholder="Buscar NRs..."
            value={form.search}
          />
        </div>

        <div className="nrs-dialog-table nrs-edit-table">
          <DataTable
            ariaLabel="Editar Normas Regulamentadoras"
            columns={columns}
            emptyMessage="Nenhuma NR encontrada."
            getRowKey={(row) => row.id}
            rows={visibleRows}
          />
        </div>

        <div className="nrs-edit-footer">
          <span className="nrs-edit-recommendation"><img alt="" aria-hidden="true" draggable={false} src="/robot4.png" />Recomendação de IA</span>
          <div className="nrs-edit-footer-actions">
            <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
            <PurpleButton onClick={() => {
              onRequestConfirmation(rows.filter((row) => form.enabledIds.has(row.id)).map((row) => row.id))
            }} type="button">Salvar</PurpleButton>
          </div>
        </div>
      </>}
    </AppModal>
  )
}

export default EditNrsDialog
