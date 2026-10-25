import { useState } from 'react'
import { nrReviewFields, validateNrDocument } from '../../utils/nrReview'
import type { NrDocument } from '../../types/nrReview'

interface NrReviewEditFormProps { document: NrDocument; onSave: (document: NrDocument) => void }
export default function NrReviewEditForm({ document, onSave }: NrReviewEditFormProps) {
  const [state, setState] = useState({ values: { ...document }, errors: {} as Partial<Record<keyof NrDocument, string>> })
  function update<K extends keyof NrDocument>(field: K, value: NrDocument[K]): void {
    setState(current => ({ values: { ...current.values, [field]: value }, errors: { ...current.errors, [field]: undefined } }))
  }
  return <form id="nr-pending-edit" noValidate onSubmit={event => {
    event.preventDefault()
    const values = { ...state.values, nome: state.values.nome.trim(), descricao: state.values.descricao.trim(), objetivo: state.values.objetivo.trim(), aplicabilidade: state.values.aplicabilidade.trim() }
    const errors = validateNrDocument(values)
    setState({ values, errors })
    if (!Object.keys(errors).length) onSave(values)
  }}>
    <h3 className="nr-review-editor-title">Corrigir análise pendente</h3>
    <p className="nr-catalog-hint">Ajuste o conteúdo gerado pela IA. Depois, confira as correções na comparação antes de aprovar.</p>
    <div className="nr-catalog-fields">
      {nrReviewFields.filter(([field]) => field !== 'ultima_atualizacao').map(([field, label]) => {
        const error = state.errors[field]
        const id = `pending-edit-${field}`
        const accessibility = { id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined }
        return <div key={field} className={`nr-catalog-field${['nome', 'descricao', 'objetivo', 'aplicabilidade'].includes(field) ? ' nr-catalog-field--wide' : ''}`}>
          <label htmlFor={id}>{label}</label>
          {field === 'revogada' ? <select {...accessibility} value={String(state.values.revogada)} onChange={event => update(field, event.target.value === 'true')}><option value="false">Não revogada</option><option value="true">Revogada</option></select>
            : field === 'usabilidade' ? <select {...accessibility} value={state.values.usabilidade} onChange={event => update(field, event.target.value === 'Empresa' ? 'Empresa' : 'Colaborador')}><option>Colaborador</option><option>Empresa</option></select>
            : field === 'tempo_reciclagem_meses' ? <input {...accessibility} type="number" min="1" step="1" value={Number.isNaN(state.values[field]) ? '' : state.values[field]} onChange={event => update(field, event.target.valueAsNumber)} />
            : field === 'nome' ? <input {...accessibility} maxLength={300} value={state.values[field]} onChange={event => update(field, event.target.value)} />
            : <textarea {...accessibility} rows={6} maxLength={20000} value={state.values[field]} onChange={event => update(field, event.target.value)} />}
          {error && <p id={`${id}-error`} className="login-field-error" role="alert">{error}</p>}
        </div>
      })}
    </div>
  </form>
}
