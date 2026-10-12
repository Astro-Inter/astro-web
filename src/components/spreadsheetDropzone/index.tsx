import { useRef, useState } from 'react'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'

interface SpreadsheetDropzoneProps {
  id: string
  file: File | null
  onFileSelect: (file: File) => void
  className?: string
  disabled?: boolean
  maxSizeMb?: number
  errorId?: string
}

function SpreadsheetDropzone({ id, file, onFileSelect, className = '', disabled = false, maxSizeMb = 10, errorId }: SpreadsheetDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <>
      <label className="sr-only" htmlFor={id}>Selecionar planilha Excel</label>
      <input
        accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label="Selecionar planilha Excel"
        aria-describedby={errorId}
        aria-invalid={Boolean(errorId)}
        disabled={disabled}
        className="sr-only"
        id={id}
        onChange={(event) => {
          const selected = event.target.files?.[0]
          if (selected && !disabled) onFileSelect(selected)
          event.target.value = ''
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <div
        className={`attach-excel-dropzone ${className}${dragging ? ' is-dragging' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={(event) => {
          event.preventDefault()
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const selected = event.dataTransfer.files[0]
          if (selected && !disabled) onFileSelect(selected)
        }}
      >
        <div className="attach-excel-dropzone-content">
          <span className="attach-excel-drop-title">{file ? file.name : 'Arraste e solte sua planilha aqui'}</span>
          <span className="attach-excel-drop-subtitle">{file ? 'Clique para trocar o arquivo.' : 'Ou clique para selecionar.'}</span>
          <PurpleButton disabled={disabled} aria-controls={id} className="attach-excel-select-button" onClick={() => inputRef.current?.click()}>
            <AstroIcon name="upload" />Selecionar arquivo
          </PurpleButton>
          <span className="attach-excel-formats">Formatos aceitos: .xlsx, .xls · Tamanho máximo: {maxSizeMb} MB</span>
        </div>
      </div>
    </>
  )
}

export default SpreadsheetDropzone
