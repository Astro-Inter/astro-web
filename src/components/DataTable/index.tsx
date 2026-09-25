import type { ReactNode } from 'react'

export interface DataTableColumn<Row> {
  id: string
  label: string
  width?: string
  className?: string
  rowHeader?: boolean
  render: (row: Row) => ReactNode
}

interface DataTableProps<Row> {
  ariaLabel: string
  columns: readonly DataTableColumn<Row>[]
  emptyMessage: string
  getRowClassName?: (row: Row) => string | undefined
  getRowKey: (row: Row) => string
  rows: readonly Row[]
}

function DataTable<Row>({ ariaLabel, columns, emptyMessage, getRowClassName, getRowKey, rows }: DataTableProps<Row>) {
  return (
    <div className="astro-data-table-shell">
      <div className="astro-data-table-scroll" tabIndex={0} role="region" aria-label={`${ariaLabel}: deslize horizontalmente para ver todas as colunas`}>
        <table className="astro-data-table">
          <colgroup>
            {columns.map((column) => <col key={column.id} style={column.width ? { width: column.width } : undefined} />)}
          </colgroup>
          <thead>
            <tr>{columns.map((column) => <th key={column.id} scope="col" title={column.label}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
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
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
