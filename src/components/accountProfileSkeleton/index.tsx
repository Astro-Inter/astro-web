interface AccountProfileSkeletonProps {
  details?: boolean
  editable?: boolean
  canChangeLinks?: boolean
  onCancel?: () => void
}

function AccountProfileSkeleton({ details = false, editable = false, canChangeLinks = false, onCancel }: AccountProfileSkeletonProps) {
  const fields = <>{Array.from({ length: details ? 6 : 2 }, (_, index) =>
    <div className="field-group" key={index}>
      <span className="api-skeleton account-skeleton-label" />
      <span className="api-skeleton account-skeleton-control" />
    </div>)}</>
  const actions = <div className={details ? 'astro-modal-actions' : 'account-main-actions'}>
    {details ? <>
      <button className="astro-modal-cancel" disabled={!onCancel} onClick={onCancel} type="button">{editable ? 'Cancelar' : 'Voltar'}</button>
      {editable && <button className="astro-action" disabled type="button">Salvar alterações</button>}
    </> : <><span aria-hidden="true" className="api-skeleton api-skeleton-action" /><span aria-hidden="true" className="api-skeleton api-skeleton-action" /></>}
  </div>
  return <div className="api-loading account-profile-skeleton" aria-busy="true">
    <span className="sr-only" role="status">{details ? 'Carregando detalhes da conta' : 'Carregando informações da conta'}</span>
    <div aria-hidden="true">
      <div className="account-profile-header">
        <div className="account-profile-photo"><span className="api-skeleton account-skeleton-photo" /></div>
        <div className="account-profile-identity account-skeleton-identity">
          <h3><span className="api-skeleton" /></h3>
          <p><span className="api-skeleton" /></p>
        </div>
      </div>
    </div>
      {details ? <div className="account-details-form">
        <fieldset aria-hidden="true" className="position-dialog-fields"><div className="account-details-grid">{fields}</div></fieldset>
        {editable && !canChangeLinks && <p className="astro-modal-description">Seu cargo e sua unidade são definidos pelo gestor do workspace.</p>}
        {actions}
      </div> : <><div aria-hidden="true" className="account-main-fields">{fields}</div>{actions}</>}
  </div>
}

export default AccountProfileSkeleton
