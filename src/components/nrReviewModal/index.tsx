import { useRef, useState } from 'react'
import { isNrReviewDemo } from '../../data/nrReviewMode'
import AppModal from '../appModal'
import NrComparison from '../nrComparison'
import ConfirmationModal from '../confirmationModal'
import PurpleButton from '../purpleButton'
import AstroIcon from '../astroIcon'
import NrReviewEditForm from '../nrReviewEditForm'
import NrLoadError from '../nrLoadError'
import { useNrReview } from '../../hooks/useNrReview'
import type { NrDemoScenario, NrDocument } from '../../types/nrReview'

interface NrReviewModalProps { id: number | null; scenario: NrDemoScenario; onClose: () => void; onApproved: (id: number, sqlSynchronized: boolean) => void }
export default function NrReviewModal({ id, scenario, onClose, onApproved }: NrReviewModalProps) {
  const { data, loading, error, retry, approve } = useNrReview(scenario, id)
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<NrDocument | null>(null)
  const [comparing, setComparing] = useState(false)
  const synchronizedSql = useRef(true)
  const candidate = data?.candidates[0]
  const document = draft ?? candidate?.document
  const approved = document ? data?.approved[document._id] ?? null : null
  return <>
    <AppModal title={document ? `Revisão da NR-${document._id}` : 'Revisão de NR'} onClose={onClose} dimmed={confirming} dismissible={!confirming} className={`nr-review-modal${comparing && !editing ? ' nr-review-modal--comparing' : ''}`}>
      {dismiss => <>
        <button type="button" className="nr-review-modal-close" aria-label="Fechar revisão" disabled={confirming} onClick={dismiss}><AstroIcon name="close" /></button>
        <div className="nr-review-modal-body" aria-busy={loading}>
        {loading ? <p role="status">Carregando análise e versão aprovada…</p> : error ? <NrLoadError title="Não foi possível abrir a revisão" message={error} onRetry={retry} />
          : !document ? <p role="status">NR pendente não encontrada. Ela pode ter sido aprovada. Volte à listagem para conferir.</p> : <>
            <p className="nr-review-modal-name">{document.nome}</p>
            <div className="nr-review-modal-status"><span className="nr-review-tag">Aguardando revisão</span><span>Análise gerada por IA · revisão humana</span></div>
            <dl className="nr-review-metadata">
              <div><dt>Usabilidade</dt><dd>{document.usabilidade}</dd></div>
              <div><dt>Situação</dt><dd>{document.revogada ? 'Revogada' : 'Não revogada'}</dd></div>
              <div><dt>Reciclagem</dt><dd>{document.tempo_reciclagem_meses} meses</dd></div>
              <div><dt>Fonte oficial</dt><dd>{document.ultima_atualizacao}</dd></div>
            </dl>
            {editing ? <NrReviewEditForm document={document} onSave={values => { setDraft(values); setEditing(false); setComparing(Boolean(approved)) }} /> : <>
              <div className="nr-review-edit-toolbar">
                {draft && <span role="status">Correções locais aplicadas à análise pendente.</span>}
                {approved && <button type="button" className="nr-review-edit-button" aria-pressed={comparing} aria-controls="nr-comparison-title" onClick={() => setComparing(value => !value)}>{comparing ? 'Ver análise pendente' : 'Comparar versões'}</button>}
                <button type="button" className="nr-review-edit-button" onClick={() => setEditing(true)}><AstroIcon name="pencil" />Editar análise</button>
              </div>
              <NrComparison pending={document} approved={approved} comparing={comparing} />
            </>}
          </>}
        </div>
        <div className="astro-modal-actions nr-review-modal-actions">
          <button className="astro-modal-cancel" type="button" disabled={confirming} onClick={editing ? () => setEditing(false) : dismiss}>{editing ? 'Cancelar edição' : document ? 'Voltar sem aprovar' : 'Fechar'}</button>
          {document && (editing ? <PurpleButton type="submit" form="nr-pending-edit">Conferir correções</PurpleButton> : <PurpleButton type="button" disabled={confirming} onClick={() => setConfirming(true)}>Aprovar NR</PurpleButton>)}
        </div>
      </>}
    </AppModal>
    {confirming && candidate && <ConfirmationModal title={`Aprovar NR-${candidate.document._id}?`} backdrop="dimmed" confirmLabel={isNrReviewDemo ? 'Confirmar aprovação simulada' : 'Confirmar aprovação'} description={`${draft ? 'As correções feitas nesta revisão serão incluídas. ' : ''}Você está revisando “${document?.nome}”. ${isNrReviewDemo ? 'Nesta demonstração, a aprovação é apenas local; nenhum dado será gravado nos bancos.' : 'A versão revisada será publicada no catálogo e removida das pendências.'}`} onCancel={() => setConfirming(false)} onConfirm={async () => { const result = await approve(candidate, draft ?? undefined); synchronizedSql.current = result?.sqlSynchronized ?? true; return null }} onConfirmed={() => onApproved(candidate.document._id, synchronizedSql.current)} />}
  </>
}
