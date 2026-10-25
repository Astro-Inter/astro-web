import { Link } from 'react-router-dom'
import AstroIcon from '../astroIcon'

interface NrApprovalNoticeProps { nrId: number; demonstration: boolean; sqlSynchronized?: boolean; onDismiss: () => void }

export default function NrApprovalNotice({ nrId, demonstration, sqlSynchronized = true, onDismiss }: NrApprovalNoticeProps) {
  return <aside className="nr-approval-notice" aria-label="Confirmação de aprovação">
    <span className="nr-approval-notice-icon" aria-hidden="true"><AstroIcon name="check" /></span>
    <div className="nr-approval-notice-content">
      <div role="status" aria-live="polite" aria-atomic="true">
        <h2>{demonstration ? 'Aprovação simulada' : 'NR aprovada com sucesso!'}</h2>
        <p>{demonstration ? `Simulação concluída: NR-${nrId} removida dos pendentes locais. Nenhuma publicação real foi realizada.` : `A versão revisada da NR-${nrId} já está disponível no catálogo.`}</p>
        {!demonstration && <p>{sqlSynchronized ? 'O catálogo SQL também foi atualizado.' : 'A atualização do catálogo SQL está pendente e será tentada novamente automaticamente. Não é necessário aprovar a NR outra vez.'}</p>}
      </div>
      <Link to="/admin/nrs/catalog">Ver catálogo<AstroIcon name="chevron-right" /></Link>
    </div>
    <button type="button" className="nr-approval-notice-close" aria-label="Fechar confirmação de aprovação" onClick={onDismiss}><AstroIcon name="close" /></button>
  </aside>
}
