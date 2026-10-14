import { useRef, useState } from 'react'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'

interface SpreadsheetDropzoneProps {
  id: string
  file: File | null
  onFileSelect: (file: File) => void
  onFileRemove?: () => void
  className?: string
  disabled?: boolean
  maxSizeMb?: number
  errorId?: string
}

function SpreadsheetDropzone({ id, file, onFileSelect, onFileRemove, className = '', disabled = false, maxSizeMb = 10, errorId }: SpreadsheetDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const selectButtonRef = useRef<HTMLButtonElement>(null)
  const [dragging, setDragging] = useState(false)
  const [removing, setRemoving] = useState(false)
  const unavailable = disabled || removing

  return (
    <>
      <label className="sr-only" htmlFor={id}>Selecionar planilha Excel</label>
      <input
        accept=".xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        aria-label="Selecionar planilha Excel"
        aria-describedby={errorId}
        aria-invalid={Boolean(errorId)}
        disabled={unavailable}
        className="sr-only"
        id={id}
        onChange={(event) => {
          const selected = event.target.files?.[0]
          if (selected && !unavailable) onFileSelect(selected)
          event.target.value = ''
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <div
        className={`attach-excel-dropzone ${className}${dragging ? ' is-dragging' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); if (!unavailable) setDragging(true) }}
        onDragLeave={(event) => {
          event.preventDefault()
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const selected = event.dataTransfer.files[0]
          if (selected && !unavailable) onFileSelect(selected)
        }}
      >
        <div className="attach-excel-dropzone-content">
          <div
            key={file ? 'selected-file' : 'empty-file'}
            className={`attach-excel-file-heading${file ? ' has-file' : ''}${removing ? ' is-removing' : ''}`}
            onAnimationEnd={(event) => {
              if (!removing || event.target !== event.currentTarget) return
              onFileRemove?.()
              setRemoving(false)
              if (inputRef.current) inputRef.current.value = ''
              selectButtonRef.current?.focus()
            }}
          >
            {file && <AstroIcon className="attach-excel-file-icon" name="document-lines" />}
            <span className={file ? 'attach-excel-file-name' : 'attach-excel-drop-title'} title={file?.name}>{file ? file.name : 'Arraste e solte sua planilha aqui'}</span>
            {file && onFileRemove && <button
              className="attach-excel-remove-file"
              type="button"
              aria-label={`Remover arquivo ${file.name}`}
              disabled={unavailable}
              onClick={() => setRemoving(true)}
            ><AstroIcon name="close" /></button>}
          </div>
          {!file && <span className="attach-excel-drop-subtitle">Ou clique para selecionar.</span>}
          <PurpleButton ref={selectButtonRef} disabled={disabled} aria-disabled={unavailable} aria-controls={id} className="attach-excel-select-button" onClick={() => { if (!unavailable) inputRef.current?.click() }}>
            <AstroIcon name="upload" />{file ? 'Trocar arquivo' : 'Selecionar arquivo'}
          </PurpleButton>
          <span className="attach-excel-formats">Formatos aceitos: .xlsx, .xls · Tamanho máximo: {maxSizeMb} MB</span>
        </div>
      </div>
    </>
  )
}

export default SpreadsheetDropzone
