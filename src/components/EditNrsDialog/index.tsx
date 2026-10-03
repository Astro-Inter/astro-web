import { getPopupDuration } from '../../utils/popupMotion'
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  onDismissRequest?: () => void
  onRequestConfirmation: (enabledIds: string[]) => void
  open?: boolean
  positionName: string
  recommendedIds?: readonly string[]
  rows?: readonly NrsRow[]
}

interface RecommendationTooltipState {
  anchorBottom: number
  anchorTop: number
  closing: boolean
  host: HTMLDialogElement
  left: number
  placement: 'above' | 'below'
  row: NrsRow
  top: number
  visualGap: number | null
}

function recommendationCopy(row: NrsRow) {
  return {
    description: 'Recomendado para este cargo.',
    title: `${row.code} - ${row.description.split(/[.\n]/)[0]}`,
  }
}

function EditNrsDialog({ contextLabel, enabledIds, dimmed = false, onCancel, onDismissRequest, onRequestConfirmation, open = true, positionName, recommendedIds = [], rows = defaultNrsRows }: EditNrsDialogProps) {
  const tooltipId = useId()
  const [form, setForm] = useState(() => ({ search: '', enabledIds: new Set(enabledIds) }))
  const [recommendationTooltip, setRecommendationTooltip] = useState<RecommendationTooltipState | null>(null)
  const recommendationTooltipRef = useRef<HTMLDivElement>(null)
  const tooltipHideTimerRef = useRef<number | null>(null)
  const tooltipCloseTimerRef = useRef<number | null>(null)
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

  function cancelTooltipHide() {
    if (tooltipHideTimerRef.current !== null) window.clearTimeout(tooltipHideTimerRef.current)
    if (tooltipCloseTimerRef.current !== null) window.clearTimeout(tooltipCloseTimerRef.current)
    tooltipHideTimerRef.current = null
    tooltipCloseTimerRef.current = null
    setRecommendationTooltip((current) => current?.closing ? { ...current, closing: false } : current)
  }

  function hideRecommendationTooltip() {
    cancelTooltipHide()
    tooltipHideTimerRef.current = window.setTimeout(() => {
      tooltipHideTimerRef.current = null
      setRecommendationTooltip((current) => current ? { ...current, closing: true } : current)
      tooltipCloseTimerRef.current = window.setTimeout(() => {
        tooltipCloseTimerRef.current = null
        setRecommendationTooltip(null)
      }, getPopupDuration('popover'))
    }, 140)
  }

  function showRecommendationTooltip(row: NrsRow, trigger: HTMLButtonElement) {
    cancelTooltipHide()
    const host = trigger.closest<HTMLDialogElement>('.nrs-edit-dialog')
    if (!host) return

    const buttonBounds = trigger.getBoundingClientRect()
    const imageBounds = trigger.querySelector('img')?.getBoundingClientRect() ?? buttonBounds
    // Mantém abaixo a posição visual anterior, ancorada na arte do robô.
    const visibleImageBottom = imageBounds.bottom - imageBounds.height * (7 / 50)
    const hostBounds = host.getBoundingClientRect()
    const zoom = Number.parseFloat(getComputedStyle(host).zoom) || 1
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const tooltipWidth = Math.min(17.5 * rootFontSize * zoom, window.innerWidth - 32, hostBounds.width - 24)
    const left = Math.max(hostBounds.left + 12, Math.min(buttonBounds.right - tooltipWidth, hostBounds.right - tooltipWidth - 12))

    setRecommendationTooltip({
      anchorBottom: buttonBounds.bottom,
      anchorTop: buttonBounds.top,
      closing: false,
      host,
      left: (left - hostBounds.left) / zoom,
      placement: 'below',
      row,
      top: (visibleImageBottom + 12 - hostBounds.top) / zoom,
      visualGap: null,
    })
  }

  useEffect(() => () => {
    if (tooltipHideTimerRef.current !== null) window.clearTimeout(tooltipHideTimerRef.current)
    if (tooltipCloseTimerRef.current !== null) window.clearTimeout(tooltipCloseTimerRef.current)
  }, [])

  useEffect(() => {
    if (!recommendationTooltip) return
    const closeOnScrollOrResize = () => setRecommendationTooltip(null)
    window.addEventListener('scroll', closeOnScrollOrResize, true)
    window.addEventListener('resize', closeOnScrollOrResize)
    return () => {
      window.removeEventListener('scroll', closeOnScrollOrResize, true)
      window.removeEventListener('resize', closeOnScrollOrResize)
    }
  }, [recommendationTooltip])

  useLayoutEffect(() => {
    const tooltip = recommendationTooltipRef.current
    if (!tooltip || !recommendationTooltip) return

    const hostBounds = recommendationTooltip.host.getBoundingClientRect()
    const tooltipBounds = tooltip.getBoundingClientRect()
    const zoom = Number.parseFloat(getComputedStyle(recommendationTooltip.host).zoom) || 1
    const inset = 12
    // Mede o espaçamento real abaixo primeiro e reutiliza o mesmo vão ao inverter a posição.
    const gap = recommendationTooltip.visualGap ?? Math.max(0, tooltipBounds.top - recommendationTooltip.anchorBottom)
    const spaceAbove = recommendationTooltip.anchorTop - hostBounds.top - inset - gap
    const spaceBelow = hostBounds.bottom - inset - recommendationTooltip.anchorBottom - gap
    const fitsBelow = tooltipBounds.height <= spaceBelow
    const fitsAbove = tooltipBounds.height <= spaceAbove
    const placement = fitsBelow ? 'below' : fitsAbove || spaceAbove >= spaceBelow ? 'above' : 'below'
    const maxLeft = hostBounds.right - inset - tooltipBounds.width
    const left = Math.max(hostBounds.left + inset, Math.min(tooltipBounds.left, maxLeft))
    const nextLeft = (left - hostBounds.left) / zoom
    const currentGap = placement === 'below'
      ? tooltipBounds.top - recommendationTooltip.anchorBottom
      : recommendationTooltip.anchorTop - tooltipBounds.bottom
    const gapCorrection = placement === 'above' ? currentGap - gap : gap - currentGap
    const nextTop = placement === recommendationTooltip.placement
      ? recommendationTooltip.top + gapCorrection / zoom
      : placement === 'below'
        ? (recommendationTooltip.anchorBottom + gap - hostBounds.top) / zoom
        : (recommendationTooltip.anchorTop - gap - tooltipBounds.height - hostBounds.top) / zoom

    if (recommendationTooltip.visualGap === null
      || placement !== recommendationTooltip.placement
      || Math.abs(nextLeft - recommendationTooltip.left) > 0.5
      || Math.abs(nextTop - recommendationTooltip.top) > 0.5) {
      setRecommendationTooltip((current) => current ? {
        ...current,
        left: nextLeft,
        placement,
        top: nextTop,
        visualGap: gap,
      } : current)
    }
  }, [recommendationTooltip])

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
        {recommendedIds.includes(row.id) && <button
          aria-describedby={recommendationTooltip?.row.id === row.id ? tooltipId : undefined}
          aria-label={`Ver recomendação de IA para ${row.code}`}
          className="nrs-edit-row-recommendation"
          onBlur={hideRecommendationTooltip}
          onClick={(event) => showRecommendationTooltip(row, event.currentTarget)}
          onFocus={(event) => showRecommendationTooltip(row, event.currentTarget)}
          onMouseEnter={(event) => showRecommendationTooltip(row, event.currentTarget)}
          onMouseLeave={hideRecommendationTooltip}
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || !recommendationTooltip) return
            event.preventDefault()
            event.stopPropagation()
            cancelTooltipHide()
            setRecommendationTooltip(null)
          }}
          type="button"
        >
          <img alt="" aria-hidden="true" className="nrs-edit-row-robot" draggable={false} src={import.meta.env.BASE_URL + "robot5.png"} />
        </button>}
      </div>,
    },
  ]

  const recommendation = recommendationTooltip ? recommendationCopy(recommendationTooltip.row) : null
  const recommendationPopover = recommendationTooltip && recommendation ? createPortal(
    <div
      className={`nrs-edit-recommendation-tooltip${recommendationTooltip.closing ? ' nrs-edit-recommendation-tooltip--closing' : ''}`}
      key={recommendationTooltip.row.id}
      onMouseEnter={cancelTooltipHide}
      onMouseLeave={hideRecommendationTooltip}
      role="tooltip"
      id={tooltipId}
      ref={recommendationTooltipRef}
      style={{ left: recommendationTooltip.left, top: recommendationTooltip.top }}
    >
      <strong>{recommendation.title}</strong>
      <span>{recommendation.description}</span>
    </div>,
    recommendationTooltip.host,
  ) : null

  return <>
    <AppModal
      backdrop="transparent"
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
          <span className="nrs-edit-recommendation"><img alt="" aria-hidden="true" draggable={false} src={import.meta.env.BASE_URL + "robot4.png"} />Recomendação de IA</span>
          <div className="nrs-edit-footer-actions">
            <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
            <PurpleButton onClick={() => {
              onRequestConfirmation(rows.filter((row) => form.enabledIds.has(row.id)).map((row) => row.id))
            }} type="button">Salvar</PurpleButton>
          </div>
        </div>
      </>}
    </AppModal>
    {recommendationPopover}
  </>
}

export default EditNrsDialog
