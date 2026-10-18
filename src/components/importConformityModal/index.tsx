import { notifyAction } from '../../utils/actionFeedback'
import ActionLoading from '../actionLoading'
import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useRef, useState, type FormEvent } from 'react'
import { validateSpreadsheetFile } from '../../utils/spreadsheet'
import type { ConformityImportResult } from '../../types/conformity'
import AppModal from '../appModal'
import AstroIcon from '../astroIcon'
import CompactPurpleButton from '../compactPurpleButton'
import PurpleButton from '../purpleButton'
import SpreadsheetDropzone from '../spreadsheetDropzone'
import SpreadsheetExplanationModal, { type SpreadsheetExample } from '../spreadsheetExplanationModal'

const conformityExample: SpreadsheetExample = {
  ariaLabel: 'Exemplo das colunas da planilha de conformidades',
  className: 'spreadsheet-preview--conformity',
  columns: [
    { label: 'CPF', className: 'spreadsheet-conformity-cpf' },
    { label: 'NR', className: 'spreadsheet-nr' },
    { label: 'Data de validade', className: 'spreadsheet-expiry' },
    { label: '', className: 'spreadsheet-empty' },
    { label: '', className: 'spreadsheet-empty' },
    { label: '', className: 'spreadsheet-empty' },
  ],
  rows: [
    ['000.000.000-00', '10', '02/12/2026'],
    ['111.111.111-11', '14', '29/06/2026'],
    ['222.222.222-22', '16', '23/10/2026'],
  ],
}

interface ImportConformityModalProps {
  dimmed?: boolean
  onClose: () => void
  onImport: (file: File) => Promise<{ error: string | null; data: ConformityImportResult | null }>
  onManualAdd: () => void
  open?: boolean
}

function ImportConformityModal({ dimmed = false, onClose, onImport, onManualAdd, open = true }: ImportConformityModalProps) {
  const explanationTriggerRef = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState<{ file: File | null; error: string }>({ file: null, error: '' })
  const [explanationOpen, setExplanationOpen] = useState(false)
  const [importState, setImportState] = useState<{ submitting: boolean; result: ConformityImportResult | null }>({ submitting: false, result: null })
  const submittingRef = useRef(false)

  function selectFile(file?: File) {
    if (!file || submittingRef.current) return
    setImportState({ submitting: false, result: null })
    const result = validateSpreadsheetFile(file)
    setSelection(result.valid ? { file: result.file, error: '' } : { file: null, error: result.message })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current || importState.result) return
    if (!selection.file) {
      setSelection((current) => ({ ...current, error: current.error || 'Selecione uma planilha para importar.' }))
      return
    }
    submittingRef.current = true
    setImportState({ submitting: true, result: null })
    setSelection(current => ({ ...current, error: '' }))
    try {
      const result = await onImport(selection.file)
      if (result.error) notifyAction(result.error, 'error')
      else if (result.data) {
        const { processed, inserted, updated, rejected, rejectedRows } = result.data
        notifyAction(`Importação concluída: ${processed} processadas, ${inserted} adicionadas, ${updated} atualizadas e ${rejected} rejeitadas.`, rejected > 0 && inserted + updated === 0 ? 'error' : 'success')
        if (rejectedRows.length > 0) {
          const reasons = new Map<string, number[]>()
          for (const row of rejectedRows) reasons.set(row.reason, [...(reasons.get(row.reason) ?? []), row.row])
          notifyAction([...reasons].map(([reason, rows]) => `${rows.length === 1 ? 'Linha' : 'Linhas'} ${rows.join(', ')}: ${reason}`).join(' '), 'error')
        }
      }
      setImportState({ submitting: false, result: result.error ? null : result.data })
    } catch (error: unknown) {
      notifyAction(error instanceof Error ? error.message : 'Não foi possível importar a planilha.', 'error')
      setImportState({ submitting: false, result: null })
    } finally { submittingRef.current = false }
  }

  return (
    <>
      <AppModal trackingName={DIALOG_NAMES.adicionar_conformidades} dismissible={!importState.submitting} className="import-conformity-modal" dimmed={dimmed || explanationOpen} onClose={onClose} open={open && !importState.result} title="Adicionar conformidades">
        {(dismiss) => <form data-track-submit={BUTTONS.comuns.adicionar} aria-busy={importState.submitting} noValidate onSubmit={handleSubmit}>
          <p className="import-conformity-subtitle">Adicione manualmente ou importe conformidades anteriores para o Astro.</p>
          <CompactPurpleButton data-track-action={BUTTONS.comuns.adicionar_manualmente} disabled={importState.submitting} aria-haspopup="dialog" className="import-conformity-manual" onClick={onManualAdd} type="button">
            <AstroIcon name="pencil" />
            Adicionar manualmente
          </CompactPurpleButton>

          <SpreadsheetDropzone disabled={importState.submitting} className="import-conformity-dropzone" file={selection.file} id="import-conformity-file" onFileSelect={selectFile} onFileRemove={() => { setSelection({ file: null, error: '' }); setImportState({ submitting: false, result: null }) }} />
          {selection.error && <p className="attach-excel-feedback" role="alert">{selection.error}</p>}
          <ActionLoading active={importState.submitting} />

          <button data-track-action={BUTTONS.comuns.como_importar_planilha} disabled={importState.submitting} aria-haspopup="dialog" className="attach-excel-model-link import-conformity-model-link" onClick={() => setExplanationOpen(true)} ref={explanationTriggerRef} type="button">
            Veja o modelo de planilha necessário
          </button>

          <div className="astro-modal-actions import-conformity-actions">
            <button data-track-action={BUTTONS.comuns.cancelar} disabled={importState.submitting} className="astro-modal-cancel" onClick={dismiss} type="button">{importState.result ? 'Fechar' : 'Cancelar'}</button>
            {!importState.result && <PurpleButton data-track-action={BUTTONS.comuns.adicionar} disabled={importState.submitting} type="submit">Adicionar</PurpleButton>}
          </div>
        </form>}
      </AppModal>
      <SpreadsheetExplanationModal
        example={conformityExample}
        onDismiss={() => {
          setExplanationOpen(false)
          explanationTriggerRef.current?.focus()
        }}
        open={explanationOpen}
      />
    </>
  )
}

export default ImportConformityModal
