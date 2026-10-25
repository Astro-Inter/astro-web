import AppModal from '../appModal'
import ConfirmationModal from '../confirmationModal'
import ReplaceAccountFlowModal from '../replaceAccountFlowModal'
import WorkspaceQueryFeedback from '../workspaceQueryFeedback'
import { useWorkspaceManagerTransfer } from '../../hooks/useWorkspaceManagerTransfer'

interface WorkspaceManagerTransferModalProps { onClose: () => void }

function WorkspaceManagerTransferModal({ onClose }: WorkspaceManagerTransferModalProps) {
  const transfer = useWorkspaceManagerTransfer()
  if (transfer.submission.error && transfer.submission.status === 409) return <AppModal title="Transferência bloqueada" onClose={onClose}>
    <p className="login-field-error" role="alert">{transfer.submission.error}</p>
    <p>É necessário resolver esse conflito antes de tentar a transferência novamente.</p>
    <div className="astro-modal-actions">
      <button type="button" className="astro-modal-cancel" onClick={transfer.editSelection}>Voltar à seleção</button>
      <button type="button" className="astro-modal-cancel" onClick={onClose}>Fechar</button>
    </div>
  </AppModal>
  if (transfer.submission.error) return <ConfirmationModal backdrop="dimmed" title="Não foi possível transferir a responsabilidade"
    description={transfer.submission.error}
    confirmLabel="Tentar novamente" cancelLabel="Voltar" onCancel={transfer.editSelection}
    onConfirm={() => transfer.save(transfer.selectedId)} onConfirmed={onClose} />
  if (transfer.loading || transfer.error || transfer.submission.pending || !transfer.managers.length) return <AppModal title="Substituir responsável pelo workspace" onClose={onClose} dismissible={!transfer.submission.pending}>
    <WorkspaceQueryFeedback loading={transfer.loading || transfer.submission.pending} error={transfer.error} onRetry={transfer.retry} />
    {!transfer.loading && !transfer.error && !transfer.submission.pending && <p role="status">Não há outro gestor ativo disponível.</p>}
    {!transfer.submission.pending && <button type="button" className="astro-modal-cancel" onClick={onClose}>Cancelar</button>}
  </AppModal>
  return <ReplaceAccountFlowModal collaborators={transfer.managers} initialReplacementId={transfer.selectedId}
    onCancel={onClose} onReplaced={id => { void transfer.save(id) }} />
}

export default WorkspaceManagerTransferModal
