import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { validateSpreadsheetFile } from '../../utils/spreadsheet'
import AppModal from '../appModal'
import AstroIcon from '../astroIcon'
import CompactPurpleButton from '../compactPurpleButton'
import PurpleButton from '../purpleButton'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const explanationTriggerRef = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState<{ file: File | null; error: string }>({ file: null, error: '' })
  const [dragging, setDragging] = useState(false)
  const [explanationOpen, setExplanationOpen] = useState(false)

  function selectFile(file?: File) {
    if (!file) return
    const result = validateSpreadsheetFile(file)
    setSelection(result.valid ? { file: result.file, error: '' } : { file: null, error: result.message })
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0])
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    selectFile(event.dataTransfer.files[0])
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
      <AppModal className="import-conformity-modal" dimmed={dimmed || explanationOpen} onClose={onClose} open={open} title="Adicionar conformidades">
        {(dismiss) => <form noValidate onSubmit={(event) => handleSubmit(event, dismiss)}>
          <p className="import-conformity-subtitle">Adicione manualmente ou importe conformidades anteriores para o Astro.</p>
          <CompactPurpleButton aria-haspopup="dialog" className="import-conformity-manual" onClick={onManualAdd} type="button">
            <AstroIcon name="pencil" />
            Adicionar manualmente
          </CompactPurpleButton>

          <input
            accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-label="Selecionar planilha Excel"
            className="sr-only"
            id="import-conformity-file"
            onChange={handleFileChange}
            ref={inputRef}
            tabIndex={-1}
            type="file"
          />
          <div
            className={`attach-excel-dropzone import-conformity-dropzone${dragging ? ' is-dragging' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
            onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="attach-excel-dropzone-content">
              <span className="attach-excel-drop-title">{selection.file ? selection.file.name : 'Arraste e solte sua planilha aqui'}</span>
              <span className="attach-excel-drop-subtitle">{selection.file ? 'Clique para trocar o arquivo.' : 'Ou clique para selecionar.'}</span>
              <PurpleButton aria-controls="import-conformity-file" className="attach-excel-select-button" onClick={() => inputRef.current?.click()} type="button">
                <AstroIcon name="upload" />Selecionar arquivo
              </PurpleButton>
              <span className="attach-excel-formats">Formatos aceitos: .xlsx, .xls · Tamanho máximo: 10 MB</span>
            </div>
          </div>
          {selection.error && <p className="attach-excel-feedback" role="alert">{selection.error}</p>}

          <button aria-haspopup="dialog" className="attach-excel-model-link import-conformity-model-link" onClick={() => setExplanationOpen(true)} ref={explanationTriggerRef} type="button">
            Veja o modelo de planilha necessário
          </button>

          <div className="astro-modal-actions import-conformity-actions">
            <button className="astro-modal-cancel" onClick={dismiss} type="button">Cancelar</button>
            <PurpleButton type="submit">Adicionar</PurpleButton>
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
