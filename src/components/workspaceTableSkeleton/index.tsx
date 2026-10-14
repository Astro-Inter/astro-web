const PLACEHOLDER_ROWS = ['first', 'second', 'third', 'fourth', 'fifth'] as const

function WorkspaceTableSkeleton() {
  return <>{PLACEHOLDER_ROWS.map(id => <tr className="workspace-skeleton-row" key={id}>
    <td><span className="workspace-skeleton workspace-skeleton-name" /></td>
    <td><span className="workspace-skeleton workspace-skeleton-count" /></td>
    <td><span className="workspace-skeleton workspace-skeleton-status" /></td>
    <td><span className="workspace-skeleton workspace-skeleton-actions" /></td>
  </tr>)}</>
}

export default WorkspaceTableSkeleton
