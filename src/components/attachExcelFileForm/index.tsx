import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, FormEvent } from 'react'
import { validateSpreadsheetFile } from '../../utils/spreadsheet'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'
import SpreadsheetExplanationModal from '../spreadsheetExplanationModal'

interface SpreadsheetSelection {
  file: File | null
  error: string
}

interface AttachExcelFileFormProps {
  onContinue: (file: File | null) => void | Promise<void>
  initialFile?: File | null
  settingsMode?: boolean
  reading?: boolean
  readingError?: string
  onSelectionChange?: () => void
}

function AttachExcelFileForm({ onContinue, settingsMode = false, initialFile = null, reading = false, readingError = '', onSelectionChange }: AttachExcelFileFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const explanationTrigger = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState<SpreadsheetSelection>({ file: initialFile, error: '' })
  const [dragging, setDragging] = useState(false)
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)

  function closeExplanation() {
    setIsExplanationOpen(false)
    explanationTrigger.current?.focus()
  }

  function selectFile(file?: File) {
    if (!file || reading) return
    onSelectionChange?.()

    if (settingsMode) {
      setSelection({ file, error: '' })
      return
    }

    const result = validateSpreadsheetFile(file, 5 * 1024 * 1024)
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reading) return
    if (!settingsMode) {
      if (!selection.file) {
        setSelection(current => ({ ...current, error: 'Selecione a planilha de colaboradores para continuar.' }))
        return
      }
      const result = validateSpreadsheetFile(selection.file, 5 * 1024 * 1024)
      if (!result.valid) {
        setSelection(current => ({ ...current, error: result.message }))
        return
      }
    }
    void onContinue(selection.file)
  }

  return (
    <section className="attach-excel-content astro-scale-90" aria-labelledby="attach-excel-title">
      <header className="login-heading attach-excel-heading">
        <h1 id="attach-excel-title">{settingsMode ? 'Anexe sua planilha para adicionar colaboradores.' : 'Anexe sua planilha para continuar'}</h1>
        <p>{settingsMode ? 'A planilha abaixo serve para o aplicativo identificar os colaboradores e montar os cadastros.' : <>A planilha serve para identificar os colaboradores e<br className="attach-excel-desktop-break" /> cadastrá-los automaticamente.</>}</p>
      </header>

      <form className="attach-excel-form" onSubmit={handleSubmit} noValidate aria-busy={reading}>
        <input
          accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-describedby={!settingsMode && (selection.error || readingError) ? 'spreadsheet-error' : undefined}
          aria-invalid={!settingsMode && Boolean(selection.error || readingError)}
          disabled={reading}
          className="sr-only"
          id="spreadsheet-file"
          onChange={handleFileChange}
          ref={inputRef}
          tabIndex={-1}
          type="file"
        />

        <label className="sr-only" htmlFor="spreadsheet-file">Selecionar planilha Excel</label>
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
            <PurpleButton
              aria-controls="spreadsheet-file"
              className="attach-excel-select-button"
              disabled={reading}
              onClick={() => inputRef.current?.click()}
            >
              <AstroIcon name="upload" />Selecionar arquivo
            </PurpleButton>
            <span className="attach-excel-formats">Formatos aceitos: .xlsx, .xls · Tamanho máximo: {settingsMode ? '10' : '5'} MB</span>
          </div>
        </div>

        {!settingsMode && <p className="attach-excel-feedback">Use a primeira aba com as colunas nome, cpf, email, unidade, cargo e modalidade. Inclua exatamente uma linha com o e-mail do gestor. Vamos identificar as unidades para você preencher seus endereços na próxima etapa. Use HIBRIDO, REMOTO ou PRESENCIAL.</p>}
        {!settingsMode && (selection.error || readingError) && <p className="attach-excel-feedback" id="spreadsheet-error" role="alert">{selection.error || readingError}</p>}
        {reading && <p className="attach-excel-feedback" role="status">Verificando os dados do gestor e identificando as unidades da planilha…</p>}

        <PurpleButton className="attach-excel-continue" type="submit" disabled={reading}>{reading ? 'Lendo planilha…' : settingsMode ? 'Adicionar colaboradores' : 'Continuar'}</PurpleButton>
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
