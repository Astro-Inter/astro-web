import type { SpreadsheetImportMessage, WorkspaceImportResult } from '../../types/workspaceSettings'

interface WorkspaceImportSummaryProps {
  result: WorkspaceImportResult | null
  rows: SpreadsheetImportMessage[]
}

function WorkspaceImportSummary({ result, rows }: WorkspaceImportSummaryProps) {
  const messages = [...new Map((result?.ignored ?? rows).map(row => [`${row.row}/${row.field}/${row.message}`, row])).values()]
  return <section aria-label="Resultado da importação" className="workspace-import-summary">
    {result && <div role="status"><h2>Planilha sincronizada</h2>
      <p>{result.created} colaboradores criados; {result.updated} atualizados; {result.unchanged} sem alterações.</p>
      <p>{result.unitsCreated} unidades criadas; {result.rolesCreated} cargos criados; {result.ignored.length} linhas ignoradas.</p>
    </div>}
    {messages.length > 0 && <div role={result ? 'status' : 'alert'}><h2>{result ? 'Linhas ignoradas' : 'Corrija as linhas indicadas e envie novamente'}</h2>
      <ul>{messages.map(row => <li key={`${row.row}/${row.field}/${row.message}`}>Linha {row.row}, campo {row.field}: {row.message}</li>)}</ul>
    </div>}
  </section>
}

export default WorkspaceImportSummary
