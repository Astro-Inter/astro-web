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
  onContinue: () => void
  settingsMode?: boolean
}

function AttachExcelFileForm({ onContinue, settingsMode = false }: AttachExcelFileFormProps) {
  const explanationTrigger = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState<SpreadsheetSelection>({ file: null, error: '' })
  const [isExplanationOpen, setIsExplanationOpen] = useState(false)

  function closeExplanation() {
    setIsExplanationOpen(false)
    explanationTrigger.current?.focus()
  }

  function selectFile(file?: File) {
    if (!file) return

    if (settingsMode) {
      setSelection({ file, error: '' })
      return
    }

    const result = validateSpreadsheetFile(file)
    setSelection(result.valid ? { file: result.file, error: '' } : { file: null, error: result.message })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onContinue()
  }

  return (
    <section className="attach-excel-content astro-scale-90" aria-labelledby="attach-excel-title">
      <header className="login-heading attach-excel-heading">
        <h1 id="attach-excel-title">{settingsMode ? 'Anexe sua planilha para adicionar colaboradores.' : 'Anexe sua planilha para continuar'}</h1>
        <p>{settingsMode ? 'A planilha abaixo serve para o aplicativo identificar os colaboradores e montar os cadastros.' : <>A planilha serve para identificar os colaboradores e<br className="attach-excel-desktop-break" /> cadastrá-los automaticamente.</>}</p>
      </header>

      <form className="attach-excel-form" onSubmit={handleSubmit} noValidate>
        <SpreadsheetDropzone file={selection.file} id="spreadsheet-file" onFileSelect={selectFile} />

        {!settingsMode && selection.error && <p className="attach-excel-feedback" role="alert">{selection.error}</p>}

        <PurpleButton className="attach-excel-continue" type="submit">{settingsMode ? 'Adicionar colaboradores' : 'Continuar'}</PurpleButton>
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
