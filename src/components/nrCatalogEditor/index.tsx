import { useState } from 'react'
import { isNrReviewDemo } from '../../data/nrReviewMode'
import AppModal from '../appModal'
import PurpleButton from '../purpleButton'
import ConfirmationModal from '../confirmationModal'
import { nrReviewFields, validateNrDocument } from '../../utils/nrReview'
import type { NrDocument } from '../../types/nrReview'

interface NrCatalogEditorProps {
  document: NrDocument
  onClose: () => void
  onSave: (document: NrDocument, expected: NrDocument) => Promise<void>
}
export default function NrCatalogEditor({ document, onClose, onSave }: NrCatalogEditorProps) {
  const [form, setForm] = useState({ values: { ...document }, editing: false, errors: {} as Partial<Record<keyof NrDocument, string>>, confirming: false })
  const values = form.values
  function update<K extends keyof NrDocument>(field: K, value: NrDocument[K]): void {
    setForm(current => ({ ...current, values: { ...current.values, [field]: value }, errors: { ...current.errors, [field]: undefined } }))
  }
  return <>
    <AppModal title={`${form.editing ? 'Editar' : 'Consultar'} NR-${document._id}`} onClose={onClose} dimmed={form.confirming} className="nr-catalog-modal">
      {dismiss => <>
        <p className="nr-catalog-hint">{isNrReviewDemo ? 'Versão atual do catálogo demonstrativo. As alterações serão salvas somente nesta sessão, sem gravar no MongoDB.' : 'Consulte a versão publicada e edite os campos que precisam de correção.'}</p>
        <form onSubmit={event => {
          event.preventDefault()
          const sanitized = { ...values, nome: values.nome.trim(), descricao: values.descricao.trim(), objetivo: values.objetivo.trim(), aplicabilidade: values.aplicabilidade.trim(), ultima_atualizacao: values.ultima_atualizacao.trim() }
          const errors = validateNrDocument(sanitized)
          setForm(current => ({ ...current, values: sanitized, errors, confirming: Object.keys(errors).length === 0 }))
        }} noValidate>
          <fieldset disabled={!form.editing || form.confirming} className="nr-catalog-fields">
            {nrReviewFields.filter(([field]) => field !== 'ultima_atualizacao').map(([field, label]) => <div key={field} className={`nr-catalog-field${['nome', 'descricao', 'objetivo', 'aplicabilidade'].includes(field) ? ' nr-catalog-field--wide' : ''}`}>
              <label htmlFor={`catalog-${field}`}>{label}</label>
              {field === 'revogada' ? <select id={`catalog-${field}`} value={String(values.revogada)} onChange={event => update('revogada', event.target.value === 'true')}><option value="false">Não revogada</option><option value="true">Revogada</option></select>
                : field === 'usabilidade' ? <select id={`catalog-${field}`} value={values.usabilidade} onChange={event => update('usabilidade', event.target.value === 'Empresa' ? 'Empresa' : 'Colaborador')}><option>Colaborador</option><option>Empresa</option></select>
                : field === 'tempo_reciclagem_meses' ? <input id={`catalog-${field}`} type="number" min="1" step="1" value={Number.isNaN(values[field]) ? '' : values[field]} onChange={event => update(field, event.target.valueAsNumber)} aria-invalid={!!form.errors[field]} aria-describedby={form.errors[field] ? `catalog-error-${field}` : undefined} />
                : field === 'descricao' || field === 'objetivo' || field === 'aplicabilidade' ? <textarea id={`catalog-${field}`} rows={6} maxLength={20000} value={values[field]} onChange={event => update(field, event.target.value)} aria-invalid={!!form.errors[field]} aria-describedby={form.errors[field] ? `catalog-error-${field}` : undefined} />
                : <input id={`catalog-${field}`} value={values[field]} maxLength={300} onChange={event => update(field, event.target.value)} aria-invalid={!!form.errors[field]} aria-describedby={form.errors[field] ? `catalog-error-${field}` : undefined} />}
              {form.errors[field] && <p id={`catalog-error-${field}`} className="login-field-error" role="alert">{form.errors[field]}</p>}
            </div>)}
          </fieldset>
          <p className="nr-catalog-hint">Criação do registro: {new Date(document.data_criacao).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Número da NR e data de criação não são editáveis.</p>
          <div className="astro-modal-actions">
            <button className="astro-modal-cancel" type="button" onClick={dismiss}>{form.editing ? 'Cancelar' : 'Fechar'}</button>
            {form.editing ? <PurpleButton type="submit">Salvar alterações</PurpleButton> : <PurpleButton type="button" onClick={() => setForm(current => ({ ...current, editing: true }))}>Editar NR</PurpleButton>}
          </div>
        </form>
      </>}
    </AppModal>
    {form.confirming && <ConfirmationModal title={`Salvar alterações da NR-${document._id}?`} description={isNrReviewDemo ? 'A versão demonstrativa atual será atualizada apenas nesta sessão. O candidato pendente permanecerá intacto. Nenhum dado será salvo no MongoDB.' : 'As correções serão salvas na versão publicada do catálogo. A análise pendente será preservada.'} confirmLabel={isNrReviewDemo ? 'Confirmar alterações simuladas' : 'Confirmar alterações'} backdrop="dimmed" onCancel={() => setForm(current => ({ ...current, confirming: false }))} onConfirm={async () => { await onSave(values, document); return null }} onConfirmed={onClose} />}
  </>
}
