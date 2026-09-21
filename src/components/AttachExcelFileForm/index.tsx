import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import AstroIcon from '../AstroIcon'
import SpreadsheetExplanationModal from '../SpreadsheetExplanationModal'

const MAX_FILE_SIZE = 10 * 1024 * 1024

interface SpreadsheetSelection {
  file: File | null
  error: string
  submitted: boolean
}

function AttachExcelFileForm() {
  const inputRef = useRef<HTMLInputElement>(null)
  const explanationTrigger = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState<SpreadsheetSelection>({ file: null, error: '', submitted: false })
  const [dragging, setDragging] = useState(false)
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)

  function closeExplanation() {
    setIsExplanationOpen(false)
    explanationTrigger.current?.focus()
  }

  function selectFile(file?: File) {
    if (!file) return

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setSelection({ file: null, error: 'Selecione uma planilha .xlsx ou .xls.', submitted: false })
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelection({ file: null, error: 'A planilha deve ter no máximo 10 MB.', submitted: false })
      return
    }

    setSelection({ file, error: '', submitted: false })
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selection.file) {
      setSelection((current) => ({ ...current, error: 'Selecione uma planilha para continuar.' }))
      return
    }

    setSelection((current) => ({ ...current, error: '', submitted: true }))
  }

  return (
    <section className="attach-excel-content" aria-labelledby="attach-excel-title">
      <header className="login-heading attach-excel-heading">
        <h1 id="attach-excel-title">Anexe sua planilha para continuar</h1>
        <p>A planilha serve para identificar os colaboradores e<br className="attach-excel-desktop-break" /> cadastrá-los automaticamente.</p>
      </header>

      <form className="attach-excel-form" onSubmit={handleSubmit} noValidate>
        <input
          accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Selecionar planilha Excel"
          className="sr-only"
          id="spreadsheet-file"
          onChange={handleFileChange}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />

        <div
          className={`attach-excel-dropzone${dragging ? ' is-dragging' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
          onDragLeave={(event) => { event.preventDefault(); setDragging(false) }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="attach-excel-dropzone-content">
            <span className="attach-excel-drop-title">{selection.file ? selection.file.name : 'Arraste e solte sua planilha aqui'}</span>
            <span className="attach-excel-drop-subtitle">{selection.file ? 'Clique para trocar o arquivo.' : 'Ou clique para selecionar.'}</span>
            <button
              aria-controls="spreadsheet-file"
              className="attach-excel-select-button"
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              <AstroIcon name="upload" />Selecionar arquivo
            </button>
            <span className="attach-excel-formats">Formatos aceitos: .xlsx, .xls · Tamanho máximo: 10 MB</span>
          </div>
        </div>

        {selection.error && <p className="attach-excel-feedback" role="alert">{selection.error}</p>}
        {selection.submitted && <p className="attach-excel-feedback" role="status">Planilha selecionada e pronta para a próxima etapa.</p>}

        <button className="attach-excel-continue" type="submit">Continuar</button>
        <button
          aria-haspopup="dialog"
          className="attach-excel-model-link"
          onClick={() => setIsExplanationOpen(true)}
          ref={explanationTrigger}
          type="button"
        >
          Veja o modelo de planilha necessário
        </button>
      </form>
      <SpreadsheetExplanationModal onDismiss={closeExplanation} open={isExplanationOpen} />
    </section>
  )
}

export default AttachExcelFileForm
