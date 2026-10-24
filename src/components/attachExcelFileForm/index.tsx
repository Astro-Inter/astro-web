import { BUTTONS } from '../../gtm/buttons'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { validateSpreadsheetFile } from '../../utils/spreadsheet'
import SpreadsheetDropzone from '../spreadsheetDropzone'
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
  onSelectionChange?: (file: File | null) => void
  onFileRemove?: () => void
}

function AttachExcelFileForm({ onContinue, settingsMode = false, initialFile = null, reading = false, readingError = '', onSelectionChange, onFileRemove }: AttachExcelFileFormProps) {
  const explanationTrigger = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState<SpreadsheetSelection>({ file: initialFile, error: '' })
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)

  function closeExplanation() {
    setIsExplanationOpen(false)
    explanationTrigger.current?.focus()
  }

  function selectFile(file?: File) {
    if (!file || reading) return
    const result = validateSpreadsheetFile(file, (settingsMode ? 10 : 5) * 1024 * 1024)
    setSelection(result.valid ? { file: result.file, error: '' } : { file: null, error: result.message })
    onSelectionChange?.(result.valid ? result.file : null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (reading) return
    if (!selection.file) {
      setSelection(current => ({ ...current, error: 'Selecione a planilha de colaboradores para continuar.' }))
      return
    }
    const result = validateSpreadsheetFile(selection.file, (settingsMode ? 10 : 5) * 1024 * 1024)
    if (!result.valid) {
      setSelection(current => ({ ...current, error: result.message }))
      return
    }
    void onContinue(selection.file)
  }

  return (
    <section className="attach-excel-content astro-scale-90" aria-labelledby="attach-excel-title">
      <header className="login-heading attach-excel-heading">
        <h1 id="attach-excel-title">{settingsMode ? 'Anexe sua planilha para adicionar colaboradores.' : 'Anexe sua planilha para continuar'}</h1>
        <p>{settingsMode ? 'A planilha abaixo serve para o aplicativo identificar os colaboradores e montar os cadastros.' : <>A planilha serve para identificar os colaboradores e<br className="attach-excel-desktop-break" /> cadastrá-los automaticamente.</>}</p>
      </header>

      <form data-track-submit={settingsMode ? BUTTONS.comuns.adicionar : BUTTONS.comuns.continuar} className="attach-excel-form" onSubmit={handleSubmit} noValidate aria-busy={reading}>
        <SpreadsheetDropzone
          file={selection.file}
          id="spreadsheet-file"
          onFileSelect={selectFile}
          onFileRemove={() => {
            setSelection({ file: null, error: '' })
            onSelectionChange?.(null)
            onFileRemove?.()
          }}
          disabled={reading}
          maxSizeMb={settingsMode ? 10 : 5}
          errorId={(selection.error || readingError) ? "spreadsheet-error" : undefined}
        />

        {(selection.error || readingError) && <p className="login-field-error" id="spreadsheet-error" role="alert">{selection.error || readingError}</p>}

        <PurpleButton data-track-action={settingsMode ? BUTTONS.comuns.adicionar : BUTTONS.comuns.continuar} className="attach-excel-continue" type="submit" disabled={reading}>{settingsMode ? 'Adicionar colaboradores' : 'Continuar'}</PurpleButton>
        <button data-track-action={BUTTONS.comuns.modelo}
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
