import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import { useRef, useState, type FormEvent } from 'react'
import { validateSpreadsheetFile } from '../../utils/spreadsheet'
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
  onImport: (file: File) => void
  onManualAdd: () => void
  open?: boolean
}

function ImportConformityModal({ dimmed = false, onClose, onImport, onManualAdd, open = true }: ImportConformityModalProps) {
  const explanationTriggerRef = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState<{ file: File | null; error: string }>({ file: null, error: '' })
  const [explanationOpen, setExplanationOpen] = useState(false)

  function selectFile(file?: File) {
    if (!file) return
    const result = validateSpreadsheetFile(file)
    setSelection(result.valid ? { file: result.file, error: '' } : { file: null, error: result.message })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>, dismiss: () => void) {
    event.preventDefault()
    if (!selection.file) {
      setSelection((current) => ({ ...current, error: current.error || 'Selecione uma planilha para importar.' }))
      return
    }
    onImport(selection.file)
    dismiss()
  }

  return (
    <>
      <AppModal trackingName={DIALOG_NAMES.adicionar_conformidades} className="import-conformity-modal" dimmed={dimmed || explanationOpen} onClose={onClose} open={open} title="Adicionar conformidades">
        {(dismiss) => <form data-track-submit={BUTTONS.comuns.adicionar} noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
          <p className="import-conformity-subtitle">Adicione manualmente ou importe conformidades anteriores para o Astro.</p>
          <CompactPurpleButton data-track-action={BUTTONS.comuns.adicionar_manualmente} aria-haspopup="dialog" className="import-conformity-manual" onClick={onManualAdd} type="button">
            <AstroIcon name="pencil" />
            Adicionar manualmente
          </CompactPurpleButton>

          <SpreadsheetDropzone className="import-conformity-dropzone" file={selection.file} id="import-conformity-file" onFileSelect={selectFile} onFileRemove={() => setSelection({ file: null, error: '' })} />
          {selection.error && <p className="attach-excel-feedback" role="alert">{selection.error}</p>}

          <button data-track-action={BUTTONS.comuns.como_importar_planilha} aria-haspopup="dialog" className="attach-excel-model-link import-conformity-model-link" onClick={() => setExplanationOpen(true)} ref={explanationTriggerRef} type="button">
            Veja o modelo de planilha necessário
          </button>

          <div className="astro-modal-actions import-conformity-actions">
            <button data-track-action={BUTTONS.comuns.cancelar} className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
            <PurpleButton data-track-action={BUTTONS.comuns.adicionar} type="submit">Adicionar</PurpleButton>
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
