import type { ReactNode } from 'react'
import DataTableSkeleton from '../dataTableSkeleton'

export interface DataTableColumn<Row> {
  id: string
  label: string
  width?: string
  className?: string
  rowHeader?: boolean
  skeleton?: 'identity' | 'text' | 'status' | 'actions'
  render: (row: Row) => ReactNode
}

interface DataTableProps<Row> {
  trackingName?: string
  ariaLabel: string
  columns: readonly DataTableColumn<Row>[]
  emptyMessage: string
  getRowClassName?: (row: Row) => string | undefined
  getRowKey: (row: Row) => string
  rows: readonly Row[]
  loadingContent?: ReactNode
  loading?: boolean
}

function DataTable<Row>({ trackingName, ariaLabel, columns, emptyMessage, getRowClassName, getRowKey, rows, loading = false, loadingContent: customLoadingContent }: DataTableProps<Row>) {
  const loadingContent = customLoadingContent ?? (loading ? <DataTableSkeleton columns={columns} /> : undefined)
  return (
    <div data-track-showcase={loadingContent ? undefined : trackingName} className="astro-data-table-shell">
      {loadingContent && <span className="sr-only" role="status">Carregando {ariaLabel.toLocaleLowerCase('pt-BR')}.</span>}
      <div className="astro-data-table-scroll" tabIndex={0} role="region" aria-label={`${ariaLabel}: deslize horizontalmente para ver todas as colunas`}>
        <table className="astro-data-table" aria-busy={Boolean(loadingContent)}>
          <colgroup>
            {columns.map((column) => <col key={column.id} style={column.width ? { width: column.width } : undefined} />)}
          </colgroup>
          <thead>
            <tr>{columns.map((column) => <th key={column.id} scope="col" title={column.label}>{column.label}</th>)}</tr>
          </thead>
          <tbody data-loading={Boolean(loadingContent)} aria-hidden={loadingContent ? true : undefined}>
            {loadingContent ?? <>
            {rows.map((row) => (
              <tr className={getRowClassName?.(row)} key={getRowKey(row)}>
                {columns.map((column) => {
                  const content = column.render(row)
                  return column.rowHeader
                    ? <th className={column.className} key={column.id} scope="row">{content}</th>
                    : <td className={column.className} key={column.id}>{content}</td>
                })}
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="astro-data-table-empty" colSpan={columns.length}>{emptyMessage}</td></tr>}
            </>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
