const PLACEHOLDER_ROWS = ['first', 'second', 'third', 'fourth', 'fifth'] as const

function CollaboratorTableSkeleton() {
  return <>{PLACEHOLDER_ROWS.map(id => <tr className="collaborator-skeleton-row" key={id}>
    <td><div className="manager-identity">
      <span className="collaborator-skeleton collaborator-skeleton-avatar" />
      <span className="collaborator-skeleton collaborator-skeleton-name" />
    </div></td>
    <td><span className="collaborator-skeleton collaborator-skeleton-email" /></td>
    <td><span className="collaborator-skeleton collaborator-skeleton-position" /></td>
    <td><span className="collaborator-skeleton collaborator-skeleton-status" /></td>
    <td><span className="collaborator-skeleton collaborator-skeleton-actions" /></td>
  </tr>)}</>
}

export default CollaboratorTableSkeleton
