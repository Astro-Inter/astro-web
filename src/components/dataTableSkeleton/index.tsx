interface DataTableSkeletonProps { columns: readonly { id: string; className?: string; rowHeader?: boolean; skeleton?: 'identity' | 'text' | 'status' | 'actions' }[] }

function DataTableSkeleton({ columns }: DataTableSkeletonProps) {
  return <>{['first', 'second', 'third', 'fourth', 'fifth'].map(row => <tr className="api-loading-row" key={row}>
    {columns.map(column => {
      const Cell = column.rowHeader ? 'th' : 'td'
      const kind = column.skeleton ?? (column.id === 'employee' ? 'identity' : column.id)
      return <Cell className={column.className} scope={column.rowHeader ? 'row' : undefined} key={column.id}>{kind === 'identity'
        ? <div className="manager-identity"><span className="api-skeleton api-skeleton-table-avatar" /><span className="api-skeleton api-skeleton-table-text" /></div>
        : <span className={`api-skeleton ${kind === 'actions' ? 'api-skeleton-table-action' : kind === 'status' ? 'api-skeleton-table-status' : 'api-skeleton-table-text'}`} />}</Cell>
    })}
  </tr>)}</>
}

export default DataTableSkeleton
