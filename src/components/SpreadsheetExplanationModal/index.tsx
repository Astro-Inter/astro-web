import { useEffect, useRef } from 'react'
import AstroIcon from '../AstroIcon'

interface SpreadsheetExplanationModalProps {
  onDismiss: () => void
  open: boolean
}

const exampleRows = [
  ['João Silva', '000.000.000-00', 'joao.silva@empresa.com', 'São Paulo', 'Analista de Dados', 'Presencial'],
  ['Maria Oliveira', '111.111.111-11', 'maria.oliveira@empresa.com', 'Rio de Janeiro', 'Gerente de Projetos', 'Remoto'],
  ['Carlos Souza', '222.222.222-22', 'carlos.souza@empresa.com', 'Belo Horizonte', 'Desenvolvedor', 'Híbrido'],
]

function SpreadsheetExplanationModal({ onDismiss, open }: SpreadsheetExplanationModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      dialog.scrollTop = 0
      titleRef.current?.focus({ preventScroll: true })
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      aria-describedby="spreadsheet-explanation-subtitle"
      aria-labelledby="spreadsheet-explanation-title"
      className="spreadsheet-explanation-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
      onClose={onDismiss}
      ref={dialogRef}
    >
      <h2 id="spreadsheet-explanation-title" ref={titleRef} tabIndex={-1}>Como importar sua planilha?</h2>
      <p className="spreadsheet-explanation-subtitle" id="spreadsheet-explanation-subtitle">
        Você envia um Excel com os dados dos colaboradores e nós preparamos tudo.
      </p>

      <div className="spreadsheet-explanation-highlight">
        <span className="spreadsheet-explanation-highlight-icon"><AstroIcon name="document" /></span>
        <div>
          <h3>Configuração rápida por planilha</h3>
          <p>Envie sua planilha e deixe o trabalho pesado com a gente. Organizamos as informações no Astro para agilizar seu dia a dia.</p>
        </div>
      </div>

      <h3 className="spreadsheet-explanation-section-title">Como deve ser sua planilha?</h3>
      <div className="spreadsheet-preview">
        <table aria-label="Exemplo das colunas da planilha de colaboradores">
          <colgroup>
            <col className="spreadsheet-row-number" />
            <col className="spreadsheet-name" />
            <col className="spreadsheet-cpf" />
            <col className="spreadsheet-email" />
            <col className="spreadsheet-unit" />
            <col className="spreadsheet-job" />
            <col className="spreadsheet-mode" />
          </colgroup>
          <thead>
            <tr className="spreadsheet-letters" aria-hidden="true">
              <th /><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th>
            </tr>
            <tr>
              <th scope="row">1</th>
              <th scope="col">Nome</th>
              <th scope="col">CPF</th>
              <th scope="col">Email</th>
              <th scope="col">Unidade</th>
              <th scope="col">Cargo</th>
              <th scope="col">Modalidade</th>
            </tr>
          </thead>
          <tbody>
            {exampleRows.map((row, index) => (
              <tr key={row[1]}>
                <th scope="row">{index + 2}</th>
                {row.map((value, column) => <td key={`${row[1]}-${column}`} title={value}>{value}</td>)}
              </tr>
            ))}
            {[5, 6, 7, 8, 9].map((rowNumber) => (
              <tr key={rowNumber}>
                <th scope="row">{rowNumber}</th>
                <td /><td /><td /><td /><td /><td />
              </tr>
            ))}
          </tbody>
        </table>
        <span className="spreadsheet-preview-download" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </div>

      <button className="spreadsheet-explanation-confirm" onClick={() => dialogRef.current?.close()} type="button">
        Entendi
      </button>
    </dialog>
  )
}

export default SpreadsheetExplanationModal
