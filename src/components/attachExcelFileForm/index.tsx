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
  onSelectionChange?: () => void
}

function AttachExcelFileForm({ onContinue, settingsMode = false, initialFile = null, reading = false, readingError = '', onSelectionChange }: AttachExcelFileFormProps) {
  const explanationTrigger = useRef<HTMLButtonElement>(null)
  const [selection, setSelection] = useState<SpreadsheetSelection>({ file: initialFile, error: '' })
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
        <SpreadsheetDropzone
          file={selection.file}
          id="spreadsheet-file"
          onFileSelect={selectFile}
          disabled={reading}
          maxSizeMb={settingsMode ? 10 : 5}
          errorId={!settingsMode && (selection.error || readingError) ? "spreadsheet-error" : undefined}
        />

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
