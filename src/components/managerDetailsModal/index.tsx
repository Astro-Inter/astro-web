import { DIALOG_NAMES } from '../../gtm/dialogs'
import { BUTTONS } from '../../gtm/buttons'
import type { ManagerDetails, ManagerFormValues } from '../../types/manager'
import type { CollaboratorOptions } from '../../types/collaborator'
import AppModal from '../appModal'
import CollaboratorForm from '../collaboratorForm'

interface ManagerDetailsModalProps {
  mode: 'view' | 'edit'
  manager: ManagerDetails | null
  options: CollaboratorOptions
  loading: boolean
  error: string
  saving: boolean
  dimmed?: boolean
  open?: boolean
  onClose: () => void
  onRetry: () => void
  onSubmit: (values: ManagerFormValues) => string | null | Promise<string | null>
}

function ManagerDetailsModal({ mode, manager, options, loading, error, saving, dimmed, open, onClose, onRetry, onSubmit }: ManagerDetailsModalProps) {
  return <AppModal trackingName={mode === 'edit' ? DIALOG_NAMES.editar_gestor : DIALOG_NAMES.informacoes_gestor} className="account-details-modal manager-details-modal" dimmed={dimmed} dismissible={!saving} onClose={onClose} open={open}
    title={mode === 'edit' ? 'Editar gestor' : 'Informações do gestor'}>
    {(dismiss) => <>
      {loading && <p role="status">Carregando informações do gestor...</p>}
      {error && <div className="position-api-feedback"><p role="alert">{error}</p><button data-track-action={BUTTONS.comuns.tentar_novamente} disabled={saving} onClick={onRetry} type="button">Tentar novamente</button></div>}
      {manager && <CollaboratorForm subject="gestor" collaborator={manager} disabled={loading || Boolean(error) || saving} saving={saving} mode={mode}
        onCancel={dismiss} onSubmit={onSubmit} options={options} />}
      {!manager && <div className="astro-modal-actions"><button data-track-action={BUTTONS.comuns.voltar} className="astro-modal-cancel" onClick={dismiss} type="button">Voltar</button></div>}
    </>}
  </AppModal>
}

export default ManagerDetailsModal
