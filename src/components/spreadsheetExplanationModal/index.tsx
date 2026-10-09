import { useRef } from 'react'
import { useAnimatedDialog } from '../../hooks/useAnimatedDialog'
import AstroIcon from '../astroIcon'
import PurpleButton from '../purpleButton'

export interface SpreadsheetExample {
  ariaLabel: string
  className?: string
  columns: readonly { label: string; className: string }[]
  rows: readonly (readonly string[])[]
}

interface SpreadsheetExplanationModalProps {
  example?: SpreadsheetExample
  onDismiss: () => void
  open: boolean
}

const employeeExample: SpreadsheetExample = {
  ariaLabel: 'Exemplo das colunas da planilha de colaboradores',
  columns: [
    { label: 'Nome', className: 'spreadsheet-name' },
    { label: 'CPF', className: 'spreadsheet-cpf' },
    { label: 'Email', className: 'spreadsheet-email' },
    { label: 'Unidade', className: 'spreadsheet-unit' },
    { label: 'Cargo', className: 'spreadsheet-job' },
    { label: 'Modalidade', className: 'spreadsheet-mode' },
  ],
  rows: [
    ['João Silva', '000.000.000-00', 'joao.silva@empresa.com', 'São Paulo', 'Analista de Dados', 'Presencial'],
    ['Maria Oliveira', '111.111.111-11', 'maria.oliveira@empresa.com', 'Rio de Janeiro', 'Gerente de Projetos', 'Remoto'],
    ['Carlos Souza', '222.222.222-22', 'carlos.souza@empresa.com', 'Belo Horizonte', 'Desenvolvedor', 'Híbrido'],
  ],
}

const columnLetters = ['A', 'B', 'C', 'D', 'E', 'F']

function SpreadsheetExplanationModal({ example = employeeExample, onDismiss, open }: SpreadsheetExplanationModalProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const { closing, dialogRef, dismiss, handleBackdropClick, handleCancel, handleClose } = useAnimatedDialog({ initialFocusRef: titleRef, onClose: onDismiss, open })

  return (
    <dialog
      aria-describedby="spreadsheet-explanation-subtitle"
      aria-labelledby="spreadsheet-explanation-title"
      className={`spreadsheet-explanation-modal astro-scale-100${closing ? ' astro-dialog--closing' : ''}`}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      onClose={handleClose}
      ref={dialogRef}
    >
      <h2 id="spreadsheet-explanation-title" ref={titleRef} tabIndex={-1}>Como importar sua planilha?</h2>
      <p className="spreadsheet-explanation-subtitle" id="spreadsheet-explanation-subtitle">
        Você envia um Excel com os dados dos colaboradores e nós preparamos tudo.
      </p>

      <div className="spreadsheet-explanation-highlight">
        <span className="spreadsheet-explanation-highlight-icon"><AstroIcon name="document" strokeScale={0.9} /></span>
        <div>
          <h3>Configuração rápida por planilha</h3>
          <p>Envie sua planilha e deixe o trabalho pesado com a gente. Organizamos as informações no Astro para agilizar seu dia a dia.</p>
        </div>
      </div>

      <h3 className="spreadsheet-explanation-section-title">Como deve ser sua planilha?</h3>
      <div className={`spreadsheet-preview${example.className ? ` ${example.className}` : ''}`}>
        <table aria-label={example.ariaLabel}>
          <colgroup>
            <col className="spreadsheet-row-number" />
            {example.columns.map((column, index) => <col className={column.className} key={columnLetters[index]} />)}
          </colgroup>
          <thead>
            <tr className="spreadsheet-letters" aria-hidden="true">
              <th />{example.columns.map((_, index) => <th key={columnLetters[index]}>{columnLetters[index]}</th>)}
            </tr>
            <tr>
              <th scope="row">1</th>
              {example.columns.map((column, index) => column.label ? <th key={columnLetters[index]} scope="col">{column.label}</th> : <td key={columnLetters[index]} />)}
            </tr>
          </thead>
          <tbody>
            {example.rows.map((row, rowIndex) => (
              <tr key={row.join('|')}>
                <th scope="row">{rowIndex + 2}</th>
                {example.columns.map((_, column) => <td key={columnLetters[column]} title={row[column]}>{row[column]}</td>)}
              </tr>
            ))}
            {[5, 6, 7, 8, 9].map((rowNumber) => (
              <tr key={rowNumber}>
                <th scope="row">{rowNumber}</th>
                {example.columns.map((_, column) => <td key={columnLetters[column]} />)}
              </tr>
            ))}
          </tbody>
        </table>
        <span className="spreadsheet-preview-download" aria-hidden="true">
          <AstroIcon name="download" strokeScale={0.9} />
        </span>
      </div>

      <PurpleButton className="spreadsheet-explanation-confirm" onClick={dismiss}>
        Entendi
      </PurpleButton>
    </dialog>
  )
}

export default SpreadsheetExplanationModal
