import type { CollaboratorDetails, CollaboratorFormValues, CollaboratorOptions } from '../../types/collaborator'
import AppModal from '../appModal'
import CollaboratorForm from '../collaboratorForm'

interface CollaboratorDialogProps {
  mode: 'create' | 'view' | 'edit'
  collaborator: CollaboratorDetails | null
  options: CollaboratorOptions
  loading: boolean
  error: string
  saving: boolean
  dimmed?: boolean
  open?: boolean
  onClose: () => void
  onRetry: () => void
  onSubmit: (values: CollaboratorFormValues) => string | null | Promise<string | null>
}

function CollaboratorDialog({ mode, collaborator, options, loading, error, saving, dimmed, open, onClose, onRetry, onSubmit }: CollaboratorDialogProps) {
  return <AppModal className="account-details-modal manager-details-modal" dimmed={dimmed} dismissible={!saving} onClose={onClose} open={open}
    title={mode === 'create' ? 'Adicionar colaborador' : mode === 'edit' ? 'Editar colaborador' : 'Informações do colaborador'}>
    {(dismiss) => <>
      {loading && <p role="status">Carregando {mode === 'create' ? 'cargos e unidades' : 'informações do colaborador'}...</p>}
      {error && <div className="position-api-feedback"><p role="alert">{error}</p><button disabled={saving} onClick={onRetry} type="button">Tentar novamente</button></div>}
      {(mode === 'create' || collaborator) && <CollaboratorForm collaborator={collaborator} disabled={loading || Boolean(error) || saving} saving={saving} mode={mode}
        onCancel={dismiss} onSubmit={onSubmit} options={options} />}
      {!collaborator && mode !== 'create' && <div className="astro-modal-actions"><button className="astro-modal-cancel" onClick={dismiss} type="button">Voltar</button></div>}
    </>}
  </AppModal>
}

export default CollaboratorDialog
