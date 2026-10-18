interface DataTableSkeletonProps { columns: readonly { id: string }[] }

function DataTableSkeleton({ columns }: DataTableSkeletonProps) {
  return <>{['first', 'second', 'third', 'fourth', 'fifth'].map(row => <tr className="api-loading-row" key={row}>
    {columns.map(column => <td key={column.id}>{column.id === 'name' || column.id === 'employee'
      ? <div className="manager-identity"><span className="api-skeleton api-skeleton-table-avatar" /><span className="api-skeleton api-skeleton-table-text" /></div>
      : <span className={`api-skeleton ${column.id === 'actions' ? 'api-skeleton-table-action' : column.id === 'status' ? 'api-skeleton-table-status' : 'api-skeleton-table-text'}`} />}</td>)}
  </tr>)}</>
}

export default DataTableSkeleton
